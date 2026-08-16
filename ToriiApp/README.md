# Registro Torii

Aplicación web para llevar el registro de ventas y apartados de figuras. Funciona sin servidor, sin base de datos y sin internet.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de las cuatro vistas |
| `styles.css` | Paleta negro + rojo Japón, tipografía y diseño responsive |
| `app.js` | Toda la lógica: registros, búsqueda, tasas, abonos y respaldos |
| `sw.js` | Guarda la app en el dispositivo para que abra sin conexión |
| `manifest.json` | Permite instalarla como app en el teléfono |
| `icon-*.png`, `apple-touch-icon.png` | Íconos del torii |

Todos van juntos en la misma carpeta, en la raíz del repositorio.

## Cómo usarla

1. Abre `index.html` en el navegador o publícala en GitHub Pages.
2. Entra a **Configuración** y carga las tasas del día: bolívares por dólar y pesos por dólar.
3. Registra desde **Nuevo registro**. Los pagados quedan en verde y los apartados en naranja.
4. Busca y filtra en **Registros**. La barra de búsqueda se pliega para no tapar la lista y recuerda cómo la dejaste.

## Publicar en GitHub Pages

1. Sube todos los archivos a la raíz del repositorio.
2. En el repositorio: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. En un minuto queda disponible en `https://tuusuario.github.io/tu-repo/`.

Todas las rutas son relativas, así que funciona sin problema dentro de un subdirectorio.

## Instalar en el teléfono

**iPhone (Safari):** abre la página → botón Compartir → **Añadir a pantalla de inicio**. Queda con su ícono propio y abre a pantalla completa, sin la barra de Safari.

**Android (Chrome):** menú de tres puntos → **Instalar aplicación**.

## Funcionamiento sin internet

La primera vez que abras la página **con** conexión, el navegador guarda una copia de la app en el dispositivo. A partir de ahí abre y funciona igual sin señal: los registros se guardan localmente de todos modos. Cuando te quedas sin conexión aparece un aviso discreto junto al logo.

Dos detalles:

- El modo sin conexión necesita HTTPS, así que funciona en GitHub Pages pero no abriendo el archivo con doble clic (`file://`). Abierta así la app igual funciona, porque los archivos ya están en tu disco.
- **Cada vez que modifiques `index.html`, `styles.css` o `app.js`, sube el número de `VERSION` en la primera línea de `sw.js`** (`v1` → `v2`, etc.). Si no lo haces, los dispositivos que ya tienen la copia guardada seguirán viendo la versión vieja. Al subirlo, quien abra la app verá el aviso "Hay una versión nueva" con un botón para actualizar.

## Dónde se guardan los datos

Todo se guarda en el `localStorage` del navegador, bajo la clave `registroTorii.v1`. Esto significa:

- Los datos viven en el dispositivo donde los cargaste, no en GitHub ni en la nube.
- Cada navegador y cada dispositivo tiene su propia copia; no se sincronizan entre sí.
- Borrar el historial o los datos del sitio borra los registros.
- Publicar el repositorio no publica los registros: el código es público, la información no.

Descarga un respaldo desde **Configuración → Datos** antes de limpiar el navegador o cambiar de teléfono, y restáuralo con *Importar respaldo* en el dispositivo nuevo.

## Personalizar el registro

En **Configuración** puedes añadir métodos de pago y campos propios (texto, número, lista de opciones o fecha). Cada cosa que agregues aparece al instante en el formulario de registro y como filtro en la búsqueda.

## Créditos

Tipografías: Shippori Mincho B1, Zen Kaku Gothic New y JetBrains Mono, cargadas desde Google Fonts y guardadas en caché tras la primera visita. Sin internet en la primera carga, el navegador usa tipografías del sistema y la app sigue funcionando.
