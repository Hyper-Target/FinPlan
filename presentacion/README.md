# De chatbot a agente · presentación

Web de la exposición (con demo interactiva y guía paso a paso) y diapositivas, en React + Vite.

## Presentar en localhost

```bash
npm install
npm run dev
```

Abra http://localhost:5173

- `#/` es la web (qué es un agente, cómo funciona, demo, resultados, guía, prompts).
- `#/slides` son las diapositivas: flechas ← → o clic a los lados; Esc vuelve a la web.
- `#/slides?print` muestra todas las diapositivas seguidas (para imprimir o exportar a PDF).

## Para compartir con los compañeros

- El proyecto React completo (esta carpeta): `npm install` y `npm run dev`.
- `npm run build` genera la versión publicable en `dist/` (se puede subir a Vercel, Netlify o GitHub Pages).
- `entregables/Diapositivas_Agentes_PlanFin.pdf`: las diapositivas exportadas desde `#/slides?print` (1280×720, sin márgenes).

## Dónde está el contenido

- `src/paginas.jsx`: las 10 secciones (cada una es una página con su menú).
- `src/Slides.jsx`: las diapositivas.
- `src/components/Chat.jsx`: la demo del chat.
- `src/data/contenido.js`: textos, comandos de instalación (verificados el 30-sep-2026), prompts y guion de la demo.
- `src/data/resultados.json`: cifras reales de CDTLive y RiskLive.
- `scripts_guia.mjs`: genera `skills/PlanFin/_prompts/03_GUIA_PROMPTS.md` desde el contenido.
