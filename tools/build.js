#!/usr/bin/env node
/*
 * TechConChris static-site builder
 * - Genera _site/ con versiones ES (raíz) y EN (/en/) por página
 * - Copia assets, inyecta title/description/canonical/hreflang/OG/Twitter/JSON-LD
 * - Reescribe enlaces internos a URLs limpias (sin .html)
 * - Genera robots.txt, sitemap.xml, _headers y _redirects
 * - Compila Tailwind CSS estático (si config.css === true)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cheerio = require('cheerio');

const cfg = require('./site.config.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, '_site');
const TOOLS = __dirname;

const TODAY = new Date().toISOString().slice(0, 10);

/* Cookie compartida entre subdominios (.techconchris.com): persiste el idioma
   elegido (toggle) y redirige si la página no coincide con la cookie. */
const LANG_SNIPPET = `(function () {
  function rd() { try { var m = document.cookie.match(/(?:^|;\\s*)techconchris_lang=([^;]+)/); return m && (m[1] === 'es' || m[1] === 'en') ? m[1] : null; } catch (e) { return null; } }
  function wr(v) { try { document.cookie = 'techconchris_lang=' + v + '; Domain=.techconchris.com; Path=/; Max-Age=31536000; SameSite=Lax; Secure'; } catch (e) {} }
  var p = location.pathname, isEn = p.indexOf('/en') === 0, c = rd();
  if (!c) { wr(isEn ? 'en' : 'es'); }
  else if (isEn && c === 'es') { location.replace('/' + p.slice(4)); }
  else if (!isEn && c === 'en') { location.replace(p === '/' ? '/en/' : '/en' + p); }
  if (window.addEventListener) {
    window.addEventListener('click', function (e) {
      var t = e.target, a = t && t.closest ? t.closest('[data-lang-nav]') : null;
      if (!a) return;
      var l = a.tagName && a.tagName === 'A' ? a : (a.closest ? a.closest('a') : null);
      if (!l) return;
      wr((l.getAttribute('href') || '').indexOf('/en') === 0 ? 'en' : 'es');
    }, false);
  }
})();`;

/* ---------- utilidades ---------- */
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); }
function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Brace-matcher robusto: una pasada con strings simples/dobles/plantillas,
   interpolaciones ${...}, comentarios de linea y de bloque. Devuelve el indice
   del cierre (close) del bloque que abre en openIdx. */
function findMatching(s, openIdx, open, close) {
  let depth = 0;
  let q = null;
  const interp = [];
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (interp.length && q === '`' && c === '$' && s[i + 1] === '{') {
      interp.push(0);
      i += 1;
      continue;
    }
    if (interp.length) {
      if (q) {
        if (c === '\\') { i++; continue; }
        if (c === q) q = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '/' && s[i + 1] === '/') {
        let e = s.indexOf('\n', i);
        i = (e === -1 ? s.length : e) - 1;
        continue;
      }
      if (c === '/' && s[i + 1] === '*') {
        let e = s.indexOf('*/', i + 2);
        i = (e === -1 ? s.length : e + 1) - 1;
        continue;
      }
      const d = interp[interp.length - 1];
      if (c === '{') interp[interp.length - 1] = d + 1;
      else if (c === '}') {
        if (d === 0) interp.pop();
        else interp[interp.length - 1] = d - 1;
      }
      continue;
    }
    if (q) {
      if (c === '\\') { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && s[i + 1] === '/') {
      let e = s.indexOf('\n', i);
      i = (e === -1 ? s.length : e) - 1;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      let e = s.indexOf('*/', i + 2);
      i = (e === -1 ? s.length : e + 1) - 1;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function evalm(src) {
  return Function('"use strict"; return (' + src + ');')();
}

/* Extrae un objeto literal: const NAME = { ... } */
function extractObject(src, name) {
  const re = new RegExp('(?:const|var|let)\\s+' + name + '\\s*=\\s*\\{');
  const m = src.match(re);
  if (!m) return null;
  const ob = m.index + m[0].length - 1;
  if (ob === -1) return null;
  const cb = findMatching(src, ob, '{', '}');
  if (cb === -1) return null;
  return evalm(src.slice(ob, cb + 1));
}

/* Extrae un array literal: const NAME = [ ... ] */
function extractArray(src, name) {
  const re = new RegExp('(?:const|var|let)\\s+' + name + '\\s*=\\s*\\[');
  const m = src.match(re);
  if (!m) return null;
  const ob = m.index + m[0].length - 1;
  if (ob === -1) return null;
  const cb = findMatching(src, ob, '[', ']');
  if (cb === -1) return null;
  return evalm(src.slice(ob, cb + 1));
}

/* Reemplaza el cuerpo de una función manteniendo cabecera: head + newBody */
function replaceFn(src, head, newBody) {
  const i = src.indexOf(head);
  if (i === -1) return src;
  const ob = src.indexOf('{', i + head.length);
  if (ob === -1) return src;
  const cb = findMatching(src, ob, '{', '}');
  if (cb === -1) return src;
  return src.slice(0, i) + head + newBody + src.slice(cb + 1);
}

/* ---------- lógica i18n en el script ---------- */
function stripCookieSystem(src, lang) {
  let s = src.replace(/\bconst\s+LANG_COOKIE\s*=\s*'techconchris_lang'\s*;\s*\n?/g, '');
  for (const head of ['function getSharedLang()', 'getSharedLang: function ()']) {
    s = replaceFn(s, head, " { return '" + lang + "'; }");
  }
  for (const head of ['function persistSharedLang(lang)', 'persistSharedLang: function (lang)']) {
    s = replaceFn(s, head, ' {}');
  }
  return s;
}

/* ---------- JSON-LD ---------- */
function jsonld(P, lang, canonical, site) {
  const chunks = [];
  const name = P.title[lang];
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TechConChris',
    url: 'https://techconchris.com',
    logo: 'https://techconchris.com/tea-cup-tea.svg'
  };
  const webapp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: name,
    description: (P.desc && P.desc[lang]) || '',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    url: canonical,
    inLanguage: lang,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: org
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: name,
    url: canonical,
    inLanguage: lang,
    publisher: org,
    description: P.desc[lang]
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'TechConChris', item: 'https://techconchris.com' },
      { '@type': 'ListItem', position: 2, name: site.shortName || 'Lab', item: site.siteUrl + '/' },
      { '@type': 'ListItem', position: 3, name: name, item: canonical }
    ]
  };
  const types = Array.isArray(P.jsonld) ? P.jsonld : (P.jsonld ? [P.jsonld] : []);
  for (const t of types) {
    if (t === 'organization') chunks.push(org);
    else if (t === 'webapp') chunks.push(webapp);
    else if (t === 'website') chunks.push(website);
    else if (t === 'breadcrumb') chunks.push(breadcrumb);
  }
  return chunks.map(c => '<script type="application/ld+json">' + JSON.stringify(c) + '</script>').join('\n');
}

/* ---------- meta head ---------- */
function injectHead($, P, lang, uri) {
  const head = $('head');
  const links = uri.alts.map(a => '<link rel="alternate" hreflang="' + a.lang + '" href="' + esc(a.href) + '">').join('\n');
  const j = jsonld(P, lang, uri.canonical, uri.site);
  const ogImage = P.ogImage || uri.site.ogImage;
  $('title').text(P.title[lang]);
  $('meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"]').remove();
  $('link[rel="canonical"],link[rel="alternate"],link[rel="next"],link[rel="prev"]').remove();
  $('script[type="application/ld+json"]').remove();
  if (!$('meta[name="viewport"]').length) {
    head.prepend('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  }
  if (!$('meta[charset]').length) {
    head.prepend('<meta charset="UTF-8">');
  }
  head.append(
    '<meta name="description" content="' + esc(P.desc[lang]) + '">\n' +
    '<meta name="robots" content="index,follow">\n' +
    '<link rel="canonical" href="' + esc(uri.canonical) + '">\n' +
    links + '\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:site_name" content="TechConChris">\n' +
    '<meta property="og:locale" content="' + (lang === 'es' ? 'es_ES' : 'en_US') + '">\n' +
    '<meta property="og:locale:alternate" content="' + (lang === 'es' ? 'en_US' : 'es_ES') + '">\n' +
    '<meta property="og:title" content="' + esc(P.title[lang]) + '">\n' +
    '<meta property="og:description" content="' + esc(P.desc[lang]) + '">\n' +
    '<meta property="og:url" content="' + esc(uri.canonical) + '">\n' +
    '<meta property="og:image" content="' + esc(ogImage) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="' + esc(P.title[lang]) + '">\n' +
    '<meta name="twitter:description" content="' + esc(P.desc[lang]) + '">\n' +
    '<meta name="twitter:image" content="' + esc(ogImage) + '">\n' +
    j
  );
  head.append('<script>' + LANG_SNIPPET + '</script>');
}

/* ---------- toggle de idioma (links a la versión del otro idioma) ---------- */
function rewriteLangToggle($, locale, slug) {
  const esHref = slug ? '/' + slug : '/';
  const enHref = slug ? '/en/' + slug : '/en/';
  $('button[data-lang],button[onclick*="toggleLang"],button[id="lang-es"],button[id="lang-en"]').each(function () {
    const $b = $(this);
    const dl = $b.attr('data-lang') || ($b.attr('id') || '').replace(/^lang-/, '') || null;
    const lang = dl || (locale === 'es' ? 'en' : 'es');
    const href = lang === 'es' ? esHref : enHref;
    const $a = $('<a>');
    const attrs = this.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const at = attrs[i];
      if (at.name === 'onclick' || at.name === 'type' || at.name === 'disabled') continue;
      $a.attr(at.name, at.value);
    }
    $a.attr('href', href);
    $a.attr('data-lang-nav', '');
    $a.html($b.html());
    if (dl) {
      $a.toggleClass('active', dl === locale);
    } else {
      $a.find('.lang-label').text(lang === 'es' ? 'ES' : 'EN');
    }
    $b.replaceWith($a);
  });
}

/* ---------- reescritura de enlaces internos (clean URLs) ---------- */
function rewriteLinks($, locale) {
  const routes = {};
  for (const p of cfg.pages) routes[p.file] = p.slug;
  const htmlRe = /^(?:\.\/)?([A-Za-z0-9_\-]+\.html)(#.*)?$/;
  $('a[href]').each(function () {
    const $a = $(this);
    const href = $a.attr('href') || '';
    const m = href.match(htmlRe);
    if (!m) return;
    const file = m[1];
    const hash = m[2] || '';
    if (!(file in routes)) return;
    const slug = routes[file];
    const clean = locale === 'en'
      ? (slug === '' ? '/en/' : '/en/' + slug + hash)
      : (slug === '' ? '/' : '/' + slug + hash);
    $a.attr('href', clean);
  });
}

/* Reescribe assets relativos a rutas absolutas de raíz (para que funcionen en /en/) */
function rewriteAssets($) {
  const assetRe = /^(?:\.\/)?([A-Za-z0-9_\-]+\.(?:svg|png|woff2?|css|js|ico|jpg|jpeg|webp|gif|json))(#.*)?$/;
  const sel = 'a[href],link[href],script[src],img[src],source[src]';
  $(sel).each(function () {
    const $el = $(this);
    const attr = this.name === 'a' || this.name === 'link' ? 'href' : 'src';
    const v = $el.attr(attr) || '';
    const m = v.match(assetRe);
    if (!m) return;
    $el.attr(attr, '/' + m[1] + (m[2] || ''));
  });
}

/* ---------- Tailwind ---------- */
function compileCss() {
  if (!cfg.css) return;
  const bin = path.join(ROOT, 'node_modules', '.bin',
    process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
  if (!fs.existsSync(bin)) {
    console.error('   [warn] tailwindcss no está instalado. Ejecuta: npm install');
    return;
  }
  execSync(
    '"' + bin + '" -c "' + path.join(TOOLS, 'tailwind.config.js') + '" -i "' + path.join(TOOLS, 'input.css') + '" -o "' + path.join(OUT, 'assets', 'main.css') + '" --minify',
    { stdio: 'inherit', cwd: ROOT }
  );
}

function applyCss($) {
  if (!cfg.css) return;
  $('script[src*="cdn.tailwindcss.com"]').remove();
  $('script').each(function () {
    const t = $(this).html() || '';
    if (t.replace(/\s/g, '').indexOf('tailwind.config') === 0) $(this).remove();
  });
  $('head').prepend('<link rel="stylesheet" href="/assets/main.css">');
}

/* ---------- modos de traducción ---------- */
function bakeDict($, dict, lang) {
  const d = dict[lang] || {};
  $('[data-i18n]').each(function () {
    const k = $(this).attr('data-i18n');
    if (d[k] != null) $(this).html(d[k]);
    $(this).removeAttr('data-i18n');
  });
  $('[data-i18n-html]').each(function () {
    const k = $(this).attr('data-i18n-html');
    if (d[k] != null) $(this).html(d[k]);
    $(this).removeAttr('data-i18n-html');
  });
  $('[data-i18n-title]').each(function () {
    const k = $(this).attr('data-i18n-title');
    if (d[k] != null) $(this).attr('title', d[k]);
    $(this).removeAttr('data-i18n-title');
  });
}

function bakePairs($, es2en) {
  const walk = function (node) {
    const kids = node.childNodes ? Array.from(node.childNodes) : [];
    for (const child of kids) {
      if (child.type === 'text') {
        const raw = child.data;
        const tr = es2en[raw.trim()];
        if (tr) child.data = raw.replace(raw.trim(), tr);
      } else if (child.type === 'tag' || child.type === 'script' || child.type === 'style') {
        walk(child);
      }
    }
  };
  $('body').each(function () { walk(this); });
}

/* ---------- lasiñas ---------- */
function createPage(P, srcText, outFile) {
  // extraer diccionario
  let dict = null;
  if (P.dict === 'translations') {
    const obj = extractObject(srcText, 'translations');
    dict = obj;
  } else if (P.dict === 'i18n') {
    dict = extractObject(srcText, 'i18n');
  } else if (P.dict === 'TCC_I18N') {
    const obj = extractObject(srcText, 'TCC_I18N');
    dict = obj && obj.translations ? obj.translations : null;
  }

  const esCanonical = P.slug === '' ? cfg.siteUrl + '/' : cfg.siteUrl + '/' + P.slug;
  const enCanonical = P.slug === '' ? cfg.siteUrl + '/en/' : cfg.siteUrl + '/en/' + P.slug;

  for (const lang of cfg.langs) {
    let s = stripCookieSystem(srcText, lang);

    // Sustituciones de string por idioma (ej: rutas internas construidas en JS)
    for (const [pat, rep] of (cfg.strings && cfg.strings[lang]) || []) {
      s = s.split(pat).join(rep);
    }

    const $ = cheerio.load(s, { decodeEntities: false });
    $('html').attr('lang', lang);

    if (cfg.css) applyCss($);

    if (lang === 'en') {
      if (P.mode === 'overlay') {
        const pairs = extractArray(s, 'I18N_PAIRS') || [];
        const es2en = {};
        for (const [e, en] of pairs) es2en[e.trim()] = en;
        const ph = extractArray(s, 'PH_PAIRS') || [];
        const phEn = {};
        for (const [e, en] of ph) phEn[e.trim()] = en;
        $('[placeholder]').each(function () {
          const v = $(this).attr('placeholder');
          if (phEn[v.trim()] != null) $(this).attr('placeholder', phEn[v.trim()]);
        });
        const ti = extractArray(s, 'TITLE_PAIRS') || [];
        const tiEn = {};
        for (const [e, en] of ti) tiEn[e.trim()] = en;
        $('[title]').each(function () {
          const v = $(this).attr('title');
          if (tiEn[v.trim()] != null) $(this).attr('title', tiEn[v.trim()]);
        });
        const og = extractArray(s, 'OG_PAIRS') || [];
        const ogEn = {};
        for (const [e, en] of og) ogEn[e.trim()] = en;
        $('optgroup[label]').each(function () {
          const v = $(this).attr('label');
          if (ogEn[v.trim()] != null) $(this).attr('label', ogEn[v.trim()]);
        });
        bakePairs($, es2en);
      } else if (P.mode === 'pairs') {
        $('[data-es][data-en]').each(function () {
          const en = $(this).attr('data-en');
          if (en != null) $(this).text(en);
        });
      } else if (dict) {
        bakeDict($, dict, 'en');
      }
    }

    // quitar selectors extra (según config); el toggle de idioma se convierte en links
    for (const sel of cfg.removeSelectors) {
      if (sel === '#lang-toggle' || sel === 'button[data-lang]' || sel === 'button[onclick*="toggleLang"]' || sel === 'button[id="lang-es"]' || sel === 'button[id="lang-en"]') continue;
      $(sel).remove();
    }
    rewriteLangToggle($, lang, P.slug);

    rewriteLinks($, lang);
    rewriteAssets($);

    const esUri = {
      canonical: esCanonical,
      alts: [
        { lang: 'es', href: esCanonical },
        { lang: 'en', href: enCanonical },
        { lang: 'x-default', href: esCanonical }
      ],
      site: cfg
    };
    const enUri = {
      canonical: enCanonical,
      alts: [
        { lang: 'es', href: esCanonical },
        { lang: 'en', href: enCanonical },
        { lang: 'x-default', href: esCanonical }
      ],
      site: cfg
    };
    injectHead($, P, lang, lang === 'en' ? enUri : esUri);

    const outPath = lang === 'en' ? path.join(OUT, 'en', outFile) : path.join(OUT, outFile);
    write(outPath, $.html());
    console.log('   ✓ ' + path.relative(OUT, outPath));
  }
}

/* ---------- assets ---------- */
function copyAssets() {
  const skip = new Set(cfg.pages.map(p => p.file));
  const walk = function (dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { walk(p, r); continue; }
      if (skip.has(e.name)) continue;
      const outP = path.join(OUT, r);
      fs.mkdirSync(path.dirname(outP), { recursive: true });
      fs.copyFileSync(p, outP);
      if (!e.name.endsWith('.html')) console.log('   · ' + r);
    }
  };
  if (fs.existsSync(SRC)) walk(SRC, '');
}

/* ---------- robots / sitemap / headers / redirects ---------- */
function writeRobots() {
  write(path.join(OUT, 'robots.txt'),
    'User-agent: *\nAllow: /\n\n' +
    'Disallow: /assets/json/\n' +
    'Disallow: /scripts/\n' +
    'Disallow: /data/\n' +
    (cfg.extraDisallow || []).map(d => 'Disallow: ' + d + '\n').join('') +
    '\nSitemap: ' + (cfg.sitemapIndex || cfg.siteUrl + '/sitemap.xml') + '\n');
}

function writeSitemap() {
  const urls = [];
  for (const P of cfg.pages) {
    const esC = P.slug === '' ? cfg.siteUrl + '/' : cfg.siteUrl + '/' + P.slug;
    const enC = P.slug === '' ? cfg.siteUrl + '/en/' : cfg.siteUrl + '/en/' + P.slug;
    urls.push({ loc: esC, p: P, lm: P.lastmod || TODAY });
    urls.push({ loc: enC, p: P, lm: P.lastmod || TODAY });
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.map(u => {
      const alt = (u.loc === cfg.siteUrl + '/' || u.loc === cfg.siteUrl + '/en/')
        ? '<xhtml:link rel="alternate" hreflang="es" href="' + esc(cfg.siteUrl + '/') + '"/>\n<xhtml:link rel="alternate" hreflang="en" href="' + esc(cfg.siteUrl + '/en/') + '"/>\n<xhtml:link rel="alternate" hreflang="x-default" href="' + esc(cfg.siteUrl + '/') + '"/>'
        : '<xhtml:link rel="alternate" hreflang="es" href="' + esc(cfg.siteUrl + '/' + u.p.slug) + '"/>\n<xhtml:link rel="alternate" hreflang="en" href="' + esc(cfg.siteUrl + '/en/' + u.p.slug) + '"/>\n<xhtml:link rel="alternate" hreflang="x-default" href="' + esc(cfg.siteUrl + '/' + u.p.slug) + '"/>';
      return '  <url>\n    <loc>' + esc(u.loc) + '</loc>\n    <lastmod>' + u.lm + '</lastmod>\n    <changefreq>' + (u.p.changefreq || 'weekly') + '</changefreq>\n    <priority>' + (u.p.priority || '0.7') + '</priority>\n' + alt + '\n  </url>';
    }).join('\n') + '\n</urlset>\n';
  write(path.join(OUT, (cfg.sitemapFile || 'sitemap.xml')), xml);
}

function writeSitemapIndex() {
  const entries = (cfg.sitemaps || []).map(s =>
    '  <sitemap>\n    <loc>' + esc(s.loc) + '</loc>\n  </sitemap>'
  ).join('\n');
  write(path.join(OUT, 'sitemap_index.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries + '\n</sitemapindex>\n');
}

function writeHeaders() {
  const t =
    '/*\n' +
    '  X-Content-Type-Options: nosniff\n' +
    '  Referrer-Policy: strict-origin-when-cross-origin\n' +
    '  X-Frame-Options: SAMEORIGIN\n' +
    '  Permissions-Policy: camera=(self), microphone=(self), gamepad=(self)\n' +
    '  Cache-Control: public, max-age=0, must-revalidate\n' +
    '/assets/*\n' +
    '  Cache-Control: public, max-age=31536000, immutable\n';
  write(path.join(OUT, '_headers'), t);
}

function writeRedirects() {
  const rules = [];
  if (cfg.langs.includes('en')) {
    rules.push('/en  /en/  301');
  }
  for (const r of cfg.extraRedirects || []) {
    if (!rules.includes(r)) rules.push(r);
  }
  if (cfg.htmlCollapse) {
    rules.push('/*.html  /:splat  301');
    rules.push('/en/*.html  /en/:splat  301');
  }
  write(path.join(OUT, '_redirects'), rules.join('\n') + '\n');
}

/* ---------- main ---------- */
console.log('>>> ' + cfg.name + ' — build');
rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });
compileCss();
copyAssets();

for (const P of cfg.pages) {
  const srcPath = path.join(SRC, P.file);
  if (!fs.existsSync(srcPath)) { console.error('   [falta] ' + srcPath); continue; }
  createPage(P, read(srcPath), P.file);
}

writeRobots();
writeSitemap();
if (cfg.sitemaps && cfg.sitemaps.length) writeSitemapIndex();
writeHeaders();
writeRedirects();
console.log('   ✓ robots.txt  ✓ sitemap  ✓ _headers  ✓ _redirects');
console.log('>>> OK: ' + path.join(ROOT, '_site'));