module.exports = {
  name: 'overlaygo',
  shortName: 'OverlayGO',
  siteUrl: 'https://overlaygo.techconchris.com',
  ogImage: 'https://overlaygo.techconchris.com/banner-1200x630.jpg',
  langs: ['es', 'en'],
  css: true,
  dict: null,
  removeSelectors: [],
  htmlCollapse: true,
  strings: {
    es: [["window.open('OBS_Guide.html'", "window.open('/obs-guide'"]],
    en: [["window.open('OBS_Guide.html'", "window.open('/en/obs-guide'"]]
  },
  extraRedirects: [
    '/obs-guide  /OBS_Guide.html  200',
    '/en/obs-guide  /en/OBS_Guide.html  200',
    '/OBS_Guide.html  /obs-guide  301',
    '/en/OBS_Guide.html  /en/obs-guide  301'
  ],
  sitemapIndex: 'https://techconchris.com/sitemap_index.xml',
  pages: [
    {
      file: 'index.html',
      slug: '',
      dict: null,
      mode: 'overlay',
      changefreq: 'monthly',
      priority: '1.0',
      jsonld: ['webapp'],
      title: {
        es: 'OverlayGO! — Generador de Overlays para OBS',
        en: 'OverlayGO! — OBS Overlay Maker'
      },
      desc: {
        es: 'Diseña gratis el overlay perfecto para tu stream o grabación de OBS: barra de nombre, micrófono, cámaras y registros con cientos de fuentes, colores y efectos.',
        en: 'Design the perfect overlay for your OBS stream or recording for free: name bar, mic, cams and records with hundreds of fonts, colors and effects.'
      }
    },
    {
      file: 'OBS_Guide.html',
      slug: 'obs-guide',
      dict: null,
      mode: 'pairs',
      changefreq: 'monthly',
      priority: '0.8',
      jsonld: ['webapp', 'breadcrumb'],
      title: {
        es: 'OverlayGO — Guía OBS Studio: Integra tu Overlay Paso a Paso',
        en: 'OverlayGO — OBS Studio Guide: Set Up Your Overlay Step by Step'
      },
      desc: {
        es: 'Tutorial paso a paso para integrar tu overlay HTML en OBS Studio, configurar la cámara transparente y optimizar el rendimiento de tus escenas.',
        en: 'Step-by-step tutorial to integrate your HTML overlay in OBS Studio, set up your transparent camera and optimize your scene performance.'
      }
    }
  ]
};