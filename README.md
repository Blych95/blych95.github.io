# BlychLife

Aplicación web para gestionar tu vida con intención: **objetivos, metas, tareas, hábitos, áreas de vida, energía/ánimo y reflexión diaria**. Todo en una sola página, sin servidores ni cuentas: tus datos se guardan en tu propio navegador.

Colores base: blanco y azul oscuro.

---

## ✨ Qué incluye

- **Jerarquía de vida**: Área → Objetivo → Meta → Tarea. El progreso fluye hacia arriba automáticamente (al completar tareas sube la meta, y al subir las metas sube el objetivo).
- **Dashboard**: panel de "Enfoque de hoy" que se adapta a tu energía, anillo de progreso global, hábitos del día, próximas tareas y atajos a ánimo/reflexión.
- **Objetivos y metas**: título grande con la etiqueta del área a su lado, **bloques coloreables** (color sólido o **degradado**), la palabra **Metas** sobre la lista de cada objetivo, y un **buscador** por texto y por Área de Vida. Puedes **eliminar metas** cuando quieras.
- **Fuegos artificiales** al completar una tarea o una meta, y una explosión **mucho más grande** al cumplir un objetivo.
- **Hábitos diarios/semanales** ligados a un **Área de Vida** (no a una meta), con **contador de racha (streak)** y **felicitación** al cumplir una semana.
- **Áreas de Vida** con **gráfico de pastel** que suma **objetivos + metas + hábitos**, y **aviso visual** si el enfoque se concentra demasiado en una sola área.
- **Matriz de Eisenhower automática**: al crear una tarea solo respondes *¿es urgente?* y *¿es importante?*, y la app la clasifica en los 4 cuadrantes.
- **Barras de progreso** para objetivos, metas y tareas, y **barra de tiempo límite** para tareas con fecha.
- **Mood & Energy Tracker**: registra tu ánimo y energía **varias veces al día** (hasta 10, mínimo 1). Si tu energía es **baja**, el dashboard te sugiere posponer la carga cognitiva alta y priorizar lo mecánico o el descanso.
- **Caja de Reflexión / Diario de gratitud**: dos preguntas al cerrar el día — *¿Qué logré hoy?* y *¿Cómo me hablé a mí mismo hoy?*
- **Calendario**: vista mensual donde cada día muestra tu ánimo/energía, qué hábitos culminaste, tu reflexión y tus notas. Puedes **añadir y eliminar varias notas** por día, y ver un **porcentaje de productividad semanal**.
- **Respaldo**: botones para **exportar / importar** tus datos en un archivo JSON y para **borrar** todo.

---

## 🚀 Cómo subirlo a TU GitHub y publicarlo (GitHub Pages)

No necesitas instalar nada: es HTML, CSS y JavaScript puro.

### Opción A — Desde la web de GitHub (la más fácil)

1. Entra a <https://github.com/new> y crea un repositorio, por ejemplo `blychlife`. Déjalo **público**.
2. En la página del repo, pulsa **Add file → Upload files**.
3. Arrastra **todo el contenido de esta carpeta** (el archivo `index.html`, y las carpetas `css/` y `js/`). Asegúrate de mantener la estructura de carpetas.
4. Pulsa **Commit changes**.
5. Ve a **Settings → Pages**.
6. En **Source** elige la rama `main` y la carpeta `/ (root)`. Guarda.
7. Espera ~1 minuto. GitHub te mostrará la URL pública, del tipo:
   `https://TU-USUARIO.github.io/blychlife/`

### Opción B — Desde la terminal (con git)

Dentro de esta carpeta:

```bash
git init
git add .
git commit -m "Primera versión de BlychLife"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/blychlife.git
git push -u origin main
```

Luego activa **Settings → Pages → Source: main / root** como en la Opción A.

---

## 💻 Probarlo en tu computadora antes de subirlo

Solo abre `index.html` con doble clic en tu navegador. Funciona sin servidor.

(Si prefieres un servidor local: `python3 -m http.server` dentro de la carpeta y abre <http://localhost:8000>.)

---

## 🗂 Estructura del proyecto

```
blychlife/
├── index.html        # Página principal
├── css/
│   └── styles.css    # Tema blanco/azul oscuro y todos los estilos
└── js/
    ├── utils.js      # Utilidades: fechas, sanitización, gráficos SVG, toasts, confeti
    ├── storage.js    # Datos (localStorage), progreso y lógica de Eisenhower y rachas
    ├── views.js      # Render de cada vista (dashboard, objetivos, tareas, hábitos…)
    └── app.js        # Navegación, modales, formularios y manejo de eventos
```

---

## 🔒 Sobre tus datos

Todo se guarda **solo en tu navegador** (localStorage), bajo la clave `blychlife_data_v1`. No se envía nada a ningún servidor. Si cambias de navegador o limpias los datos del sitio, usa **Exportar** para llevar un respaldo y **Importar** para restaurarlo.

---

## Licencia

MIT. Ver el archivo [LICENSE](LICENSE).
