# BlychFood

Control de gastos de mercado, despensa, dietas y salud. Todo funciona sin servidor: los datos se guardan en el navegador del dispositivo (localStorage).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa. Es el único archivo que vas a editar. |
| `manifest.webmanifest` | Nombre, colores e iconos al instalarla. |
| `sw.js` | Hace que abra sin internet. |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Iconos de la pantalla de inicio. |

Los cinco archivos van juntos en la **raíz del repositorio**, sin carpetas.

## Subirla a GitHub Pages

1. Crea un repositorio nuevo (por ejemplo `blychfood`) y súbelo con estos archivos.
2. Entra a **Settings → Pages**.
3. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. Espera un minuto. La URL queda como `https://TUUSUARIO.github.io/blychfood/`.

Tiene que ser `https://` para que funcione la instalación y el modo sin internet. GitHub Pages ya lo da.

## Instalarla en el teléfono

- **Android (Chrome):** abre la URL, menú de tres puntos → *Instalar aplicación*. También aparece un botón "Instalar BlychFood" al final de Configuración.
- **iPhone (Safari):** abre la URL, botón de compartir → *Agregar a pantalla de inicio*. En iOS solo funciona desde Safari.

Una vez instalada abre a pantalla completa, sin barra del navegador, y funciona sin datos.

## Primeros pasos dentro de la app

1. **Configuración** → carga la tasa del día (USD→Bs y USD→COP). Sin eso no hay conversiones.
2. **Configuración** → pon tu presupuesto mensual si quieres el aviso al pasarte.
3. **Más → Lugares** → registra dónde compras. Esto alimenta el comparador de precios.
4. **Salud y volumen** → llena tu perfil y fija tus metas de calorías y proteínas.
5. Botón **+** → registra tus primeros alimentos.
6. **Más → Nutrición** → cárgale los macros a cada uno.

## Cosas que conviene saber

**Respalda.** Los datos viven solo en ese navegador. Si limpias el historial, cambias de teléfono o desinstalas, se pierden. En *Configuración → Respaldo* exporta un `.json` cada cierto tiempo y guárdalo en tu Drive. Ese mismo archivo se importa en otro dispositivo.

**Cada dispositivo tiene sus propios datos.** No hay sincronización automática entre el teléfono y la computadora: se pasan con exportar/importar.

**Al editar la app.** Si cambias `index.html`, sube también el número de versión en la primera línea útil de `sw.js` (`blychfood-v1` → `blychfood-v2`). Si no, el teléfono puede seguir mostrando la versión vieja guardada en caché.

**Historial de precios.** Cada alimento que registres con precio y kilos guarda automáticamente su precio por kilo, la tasa y el lugar. Con dos registros del mismo alimento ya puedes comparar dónde sale más barato y cuánto subió.

**Los macros y los precios sobreviven al borrado.** Si borras un alimento de la despensa y luego compras otro con el mismo nombre, las calorías y el historial de precios se cargan solos.

## Colores de la despensa

| Color | Qué significa |
|---|---|
| Rojo | Vencido o por vencer |
| Morado | Agotado o con pocos gramos |
| Naranja | Se acaba el tiempo estimado de consumo |
| Verde | En buen estado |

Los tres umbrales se ajustan en *Configuración → Colores de la despensa*.
