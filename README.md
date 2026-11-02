# CrH-Anatomy

Plataforma educativa de anatomía del suelo pélvico para fisioterapia, con visor 3D y asistente **CrH-IA** (Gemini). Lista para desplegar en **Railway**.

## Desplegar en Railway
1. Sube el proyecto a un repositorio de GitHub (`git init && git add . && git commit -m "CrH-Anatomy"`).
2. En Railway: **New Project → Deploy from GitHub repo** y elige el repositorio. Railway detecta Node, ejecuta `npm install` y arranca con `npm start` (ya definido en `railway.json`).
3. En **Variables** añade:
   | Variable | Valor |
   |---|---|
   | `GEMINI_API_KEY` | tu llave de Gemini (obligatoria para el chat con IA) |
   | `GEMINI_MODEL` | opcional; por defecto `gemini-3.8-flash` |
   | `RATE_LIMIT_PER_MIN` | opcional; por defecto 20 consultas/min por IP |
4. En **Settings → Networking** pulsa **Generate Domain** (o conecta tu dominio propio).
5. Railway comprueba `GET /health` antes de dar por bueno cada despliegue.

No hace falta definir `PORT` ni `NODE_ENV`: Railway inyecta `PORT` y la app detecta el entorno (`RAILWAY_ENVIRONMENT`) para escuchar en `0.0.0.0`, activar caché, HSTS y confiar en el proxy.

> Sin `GEMINI_API_KEY` el sitio funciona igual y el chat responde con la búsqueda local sobre el contenido integrado.

## Desarrollo local
```bash
npm install
cp .env.example .env     # y pega tu GEMINI_API_KEY
npm run dev              # http://127.0.0.1:3000
npm test                 # pruebas de humo (IA simulada)
```

## Estructura
```
server/            index.js (arranque) · app.js · config.js · pages.js · chat.js · security.js
views/             layout.html, widget.html, pages/*.html
public/            css/, js/ (incluye viewer.bundle.js), img/ (logo, lámina, pelvis.glb)
src/viewer.js      código fuente del visor 3D (Three.js)
scripts/           build-viewer.js, build-standalone.js
tests/             smoke.test.js
railway.json       healthcheck y política de reinicio
```

## Visor 3D
`public/js/viewer.bundle.js` va **incluido en el repositorio**, así que Railway no necesita compilarlo. Si modificas `src/viewer.js`: `npm run build:viewer` y sube el resultado. `npm run build:standalone` genera `modelos-3d.html`, un único archivo que funciona sin servidor.

## Seguridad y rendimiento
CSP estricta (solo recursos propios + Google Fonts), HSTS en producción, compresión gzip, límite de 100 KB por petición, límite de consultas por IP, tiempo máximo de 30 s con Gemini y apagado ordenado con SIGTERM.

> El límite por IP vive en memoria: es correcto con una sola instancia. Si escalas a varias réplicas, muévelo a Redis.

## Licencias y atribución
Los modelos 3D proceden de [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) (derivados de BodyParts3D), licencia **CC BY-SA 4.0**; `public/img/pelvis.glb` es una adaptación y debe compartirse con la misma licencia. El contenido es educativo y no sustituye la valoración de un profesional de la salud.
