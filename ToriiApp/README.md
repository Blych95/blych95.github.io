# Registro Torii

Aplicación web para llevar el registro de ventas y apartados de figuras. Funciona sin servidor ni base de datos: HTML, CSS y JavaScript puro.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de las cuatro vistas |
| `styles.css` | Paleta negro + rojo Japón, tipografía y diseño responsive |
| `app.js` | Toda la lógica: registros, búsqueda, tasas, abonos y respaldos |

Los tres archivos van juntos en la misma carpeta.

## Cómo usarla

1. Abre `index.html` en el navegador (doble clic) o publícala en GitHub Pages.
2. Entra a **Configuración** y carga las tasas del día: bolívares por dólar y pesos por dólar.
3. Registra desde **Nuevo registro**. Los pagados quedan marcados en verde y los apartados en naranja.
4. Busca y filtra en **Registros**. Toca cualquier fila para ver el detalle con el precio en dólares, bolívares y pesos.

## Publicar en GitHub Pages

1. Sube los tres archivos a la raíz del repositorio.
2. En el repositorio: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. En un minuto la app queda disponible en `https://tuusuario.github.io/tu-repo/`.

## Dónde se guardan los datos

Todo se guarda en el `localStorage` del navegador, bajo la clave `registroTorii.v1`. Esto significa:

- Los datos viven en el dispositivo donde los cargaste, no en GitHub ni en la nube.
- Cada navegador y cada dispositivo tiene su propia copia.
- Borrar el historial o los datos del sitio borra los registros.
- Publicar el repositorio no publica los registros: el código es público, la información no.

Descarga un respaldo desde **Configuración → Datos** antes de limpiar el navegador o cambiar de teléfono, y restáuralo con *Importar respaldo* en el dispositivo nuevo.

## Personalizar el registro

En **Configuración** puedes añadir métodos de pago y campos propios (texto, número, lista de opciones o fecha). Cada cosa que agregues aparece al instante en el formulario de registro y como filtro en la búsqueda.

## Créditos y licencia

Tipografías: Shippori Mincho B1, Zen Kaku Gothic New y JetBrains Mono, cargadas desde Google Fonts (si no hay internet, el navegador usa tipografías del sistema y la app sigue funcionando).
