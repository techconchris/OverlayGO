# OverlayGO!

**Diseña overlays increíbles para OBS Studio — directo en tu navegador y gratis.**

[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-yellow.svg)](LICENSE)
[![Sitio web](https://img.shields.io/website?url=https%3A%2F%2Foverlaygo.techconchris.com&label=overlaygo.techconchris.com)](https://overlaygo.techconchris.com)
[![Estrellas](https://img.shields.io/github/stars/techconchris/OverlayGO?label=estrellas)](https://github.com/techconchris/OverlayGO/stargazers)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#stack-tecnol%C3%B3gico)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](#stack-tecnol%C3%B3gico)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white)](#stack-tecnol%C3%B3gico)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](#stack-tecnol%C3%B3gico)
[![OBS Studio](https://img.shields.io/badge/OBS_Studio-302E31?logo=obsstudio&logoColor=white)](https://obsproject.com/)

[English](README.md) · **Español**

<img src="src/banner%20OverlayGO.jpg" alt="OverlayGO! — generador de overlays para OBS" width="100%">

---

## Descripción

OverlayGO! es una aplicación web gratuita y de código abierto para diseñar
overlays personalizados para **OBS Studio** sin instalar nada. Elige la forma,
ajusta el borde, el glow, los colores y las animaciones, añade un nickname y un
indicador REC, y descarga un archivo HTML autocontenido que puedes cargar como
**Fuente de Navegador** en OBS.

Sin cuentas, sin marcas de agua y sin herramientas de compilación para usarla.

## Demo en vivo

👉 **[overlaygo.techconchris.com](https://overlaygo.techconchris.com)**

Disponible en **español** e **inglés**.

## Características

- 🎨 **Marco totalmente configurable** — tamaño, redondeo, grosor del borde y glow.
- 🌈 **Colores en degradado** y una amplia variedad de **efectos animados**:
  giro, serpiente, doble serpiente, dash, tick-tock, neón, glow pulsante,
  arcoíris y latido.
- 🖼️ **Borde doble** (anillo exterior) e **interior transparente** para colocar
  el overlay encima de tu cámara.
- 🔴 **Indicador REC** con esquina, margen y tamaño configurables.
- ✍️ **Texto de nickname** arriba o abajo del marco, con fuente, tamaño, color y glow.
- 💾 **Presets** guardados localmente en tu navegador.
- 📐 **Asistente de tamaño para OBS** — la app indica el tamaño exacto que debe
  tener la fuente de navegador para que el glow y el anillo no se recorten.
- 📥 **Exportación a HTML en un clic** y descarga de **máscara PNG**.
- 🌍 **Interfaz en español e inglés**.
- 🚫 **Sin rastreo, sin cuentas y sin dependencias en tiempo de ejecución.**

## Inicio rápido con OBS

1. Abre la [app en vivo](https://overlaygo.techconchris.com) y diseña tu overlay.
2. Mira el recuadro **“Tamaño para OBS”** en la sección **Tamaño**. Muestra el
   ancho × alto que debes usar, ya incluyendo el borde, el anillo y el margen del glow.
3. Descarga el overlay. El archivo se nombra según su tamaño, por ejemplo
   `OverlayGO-950x750.html`.
4. En OBS, agrega una **Fuente de Navegador**, marca **Archivo local** y selecciona
   el HTML descargado.
5. Configura el **ancho y alto** de la fuente con los valores que muestra la app.
   Si usas solo el tamaño del marco, el glow se recortará porque OBS no dibuja
   fuera del área de la fuente.

La app incluye una guía paso a paso (**Guía OBS**).

## Stack tecnológico

- Páginas **HTML** estáticas con **Tailwind CSS**
- **JavaScript** vanilla — el generador del overlay corre entero en el navegador
- Un pequeño script de build en **Node.js** (`tools/build.js`) que produce el
  sitio bilingüe estático, inyecta metadatos SEO y compila Tailwind

## Estructura del proyecto

```text
OverlayGO/
├── src/                  # Fuente editable (HTML, imágenes)
│   ├── index.html        # Diseñador de overlays
│   ├── OBS_Guide.html    # Guía paso a paso para OBS
│   ├── banner-1200x630.jpg
│   └── obs.png
├── tools/                # Pipeline de build
│   ├── build.js          # Generador estático + i18n + SEO
│   ├── site.config.js    # Páginas, idiomas, metadatos
│   ├── tailwind.config.js
│   └── input.css
├── _site/                # Salida generada (ignorada por git)
├── .gitignore
├── package.json
└── package-lock.json
```

## Desarrollo local

Requisitos: **Node.js 18+**.

```bash
npm install
npm run build
```

El sitio generado se escribe en `_site/`. Puedes servirlo con cualquier servidor
estático, por ejemplo:

```bash
npx serve _site
```

Edita solo los archivos de `src/` y `tools/`; `_site/` se regenera en cada build
y nunca se edita a mano.

## Internacionalización

El sitio se compila como dos versiones estáticas completas:

- Español en `/`
- Inglés en `/en/`

Los textos estáticos viven en `src/` (atributos `data-es` / `data-en` y las tablas
`I18N_PAIRS`); el build los hornea en cada idioma al compilar.

## Contribuir

Las contribuciones, reportes de bugs e ideas de features son bienvenidos.

1. Haz un fork del repositorio.
2. Crea una rama: `git checkout -b feat/mi-feature`.
3. Realiza los cambios en `src/` o `tools/`.
4. Ejecuta `npm run build` y revisa la salida en `_site/`.
5. Abre un pull request describiendo el cambio.

Mantén los comentarios y la documentación en español, los identificadores de
código en inglés, y asegúrate de que el build quede verde.

## Licencia

Publicado bajo la [Licencia MIT](LICENSE).

---

Hecho con ❤️ por [TechConChris](https://github.com/techconchris) para la comunidad de streaming.
