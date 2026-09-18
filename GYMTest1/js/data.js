/**
 * BlychGym - Base de Datos Inicial y Configuración
 * Rutinas predeterminadas, catálogo de ejercicios y valores por defecto.
 */

const DEFAULT_EXERCISES = [
  // Pecho
  { id: 'bench-press', name: 'Press de Banca Plano', muscle: 'Pecho', equipment: 'Barra', icon: '🏋️‍♂️' },
  { id: 'incline-dumbbell-press', name: 'Press Inclinado con Mancuernas', muscle: 'Pecho', equipment: 'Mancuernas', icon: '📐' },
  { id: 'chest-flyes', name: 'Aperturas en Polea / Cruces', muscle: 'Pecho', equipment: 'Polea', icon: '🦅' },
  { id: 'dips-chest', name: 'Fondos en Paralelas (Pecho)', muscle: 'Pecho', equipment: 'Peso Corporal', icon: '⚡' },
  { id: 'pushups', name: 'Flexiones de Pecho', muscle: 'Pecho', equipment: 'Peso Corporal', icon: '🛡️' },

  // Espalda
  { id: 'pullups', name: 'Dominadas Pronas', muscle: 'Espalda', equipment: 'Barra', icon: '🧗' },
  { id: 'barbell-row', name: 'Remo con Barra 90°', muscle: 'Espalda', equipment: 'Barra', icon: '🚣' },
  { id: 'lat-pulldown', name: 'Jalón al Pecho en Polea', muscle: 'Espalda', equipment: 'Polea', icon: '⚓' },
  { id: 'seated-cable-row', name: 'Remo Sentado en Polea Baja', muscle: 'Espalda', equipment: 'Polea', icon: '🏹' },
  { id: 'deadlift', name: 'Peso Muerto Convencional', muscle: 'Espalda', equipment: 'Barra', icon: '💥' },

  // Piernas
  { id: 'squat', name: 'Sentadilla Trasera con Barra', muscle: 'Piernas', equipment: 'Barra', icon: '🦵' },
  { id: 'leg-press', name: 'Prensa Inclinada 45°', muscle: 'Piernas', equipment: 'Máquina', icon: '🚜' },
  { id: 'romanian-deadlift', name: 'Peso Muerto Rumano', muscle: 'Piernas', equipment: 'Barra/Mancuernas', icon: '🎯' },
  { id: 'leg-extension', name: 'Extensión de Cuádriceps', muscle: 'Piernas', equipment: 'Máquina', icon: '⚡' },
  { id: 'leg-curl', name: 'Curl Femoral Tumbado/Sentado', muscle: 'Piernas', equipment: 'Máquina', icon: '🔄' },
  { id: 'calf-raise', name: 'Elevación de Talones (Gemelos)', muscle: 'Piernas', equipment: 'Máquina', icon: '🦶' },

  // Hombros
  { id: 'overhead-press', name: 'Press Militar de Pie', muscle: 'Hombros', equipment: 'Barra', icon: '👑' },
  { id: 'lateral-raise', name: 'Elevaciones Laterales', muscle: 'Hombros', equipment: 'Mancuernas/Polea', icon: '🕊️' },
  { id: 'rear-delt-fly', name: 'Pájaros para Deltoides Posterior', muscle: 'Hombros', equipment: 'Mancuernas', icon: '🦇' },
  { id: 'arnold-press', name: 'Press Arnold', muscle: 'Hombros', equipment: 'Mancuernas', icon: '💪' },

  // Brazos (Bíceps y Tríceps)
  { id: 'barbell-bicep-curl', name: 'Curl de Bíceps con Barra Z', muscle: 'Bíceps', equipment: 'Barra', icon: '💪' },
  { id: 'hammer-curl', name: 'Curl Martillo', muscle: 'Bíceps', equipment: 'Mancuernas', icon: '🔨' },
  { id: 'incline-curl', name: 'Curl en Banco Inclinado', muscle: 'Bíceps', equipment: 'Mancuernas', icon: '🔥' },
  { id: 'tricep-rope-pushdown', name: 'Extensión de Tríceps en Polea (Cuerda)', muscle: 'Tríceps', equipment: 'Polea', icon: '🐍' },
  { id: 'skull-crusher', name: 'Press Francés / Rompecráneos', muscle: 'Tríceps', equipment: 'Barra Z', icon: '💀' },

  // Core / Abdomen
  { id: 'hanging-leg-raise', name: 'Elevación de Piernas Colgado', muscle: 'Core', equipment: 'Barra', icon: '🧗' },
  { id: 'cable-woodchopper', name: 'Giros Rusos / Leñador Polea', muscle: 'Core', equipment: 'Polea', icon: '🌪️' },
  { id: 'plank', name: 'Plancha Abdominal Isométrica', muscle: 'Core', equipment: 'Peso Corporal', icon: '🧱' }
];

const DEFAULT_ROUTINES = [
  {
    id: 'split-lunes-viernes',
    name: 'División Lunes a Viernes (5 Días)',
    description: 'Enfocada para tu horario de Lunes a Viernes con descanso los fines de semana.',
    daysCount: 5,
    exercises: [
      { exerciseId: 'bench-press', sets: 4, reps: 10, targetWeight: 70 },
      { exerciseId: 'incline-dumbbell-press', sets: 3, reps: 12, targetWeight: 24 },
      { exerciseId: 'overhead-press', sets: 4, reps: 8, targetWeight: 45 },
      { exerciseId: 'lateral-raise', sets: 4, reps: 15, targetWeight: 10 },
      { exerciseId: 'tricep-rope-pushdown', sets: 4, reps: 12, targetWeight: 25 }
    ]
  },
  {
    id: 'push-day',
    name: 'Push (Empuje / Pecho, Hombro, Tríceps)',
    description: 'Máxima potencia y desarrollo para el tren superior anterior.',
    daysCount: 1,
    exercises: [
      { exerciseId: 'bench-press', sets: 4, reps: 8, targetWeight: 75 },
      { exerciseId: 'incline-dumbbell-press', sets: 3, reps: 10, targetWeight: 26 },
      { exerciseId: 'dips-chest', sets: 3, reps: 10, targetWeight: 0 },
      { exerciseId: 'lateral-raise', sets: 4, reps: 15, targetWeight: 12 },
      { exerciseId: 'skull-crusher', sets: 3, reps: 12, targetWeight: 30 }
    ]
  },
  {
    id: 'pull-day',
    name: 'Pull (Tracción / Espalda y Bíceps)',
    description: 'Construcción de densidad y amplitud dorsal junto a brazos.',
    daysCount: 1,
    exercises: [
      { exerciseId: 'pullups', sets: 4, reps: 8, targetWeight: 0 },
      { exerciseId: 'barbell-row', sets: 4, reps: 10, targetWeight: 65 },
      { exerciseId: 'lat-pulldown', sets: 3, reps: 12, targetWeight: 60 },
      { exerciseId: 'barbell-bicep-curl', sets: 4, reps: 10, targetWeight: 32 },
      { exerciseId: 'hammer-curl', sets: 3, reps: 12, targetWeight: 14 }
    ]
  },
  {
    id: 'legs-core-day',
    name: 'Legs & Core (Pierna y Abdomen)',
    description: 'Trabajo integral de tren inferior y estabilidad.',
    daysCount: 1,
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: 8, targetWeight: 90 },
      { exerciseId: 'leg-press', sets: 4, reps: 12, targetWeight: 160 },
      { exerciseId: 'romanian-deadlift', sets: 4, reps: 10, targetWeight: 75 },
      { exerciseId: 'leg-curl', sets: 3, reps: 12, targetWeight: 45 },
      { exerciseId: 'calf-raise', sets: 4, reps: 15, targetWeight: 50 },
      { exerciseId: 'hanging-leg-raise', sets: 3, reps: 15, targetWeight: 0 }
    ]
  }
];

// Genera un historial de demostración inicial realista para los últimos días programados
function generateInitialDemoHistory(scheduledDays = [1, 2, 3, 4, 5]) {
  const history = [];
  const today = new Date();
  const activeSet = new Set(scheduledDays);
  
  // Racha de ejemplo en los últimos 4 días programados
  let count = 0;
  for (let offset = 1; count < 4 && offset < 14; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const jsDay = d.getDay() === 0 ? 7 : d.getDay();

    if (activeSet.has(jsDay)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      history.push({
        id: 'hist_' + dateKey,
        date: dateKey,
        routineName: count % 2 === 0 ? 'Push (Empuje)' : 'Pull (Tracción)',
        durationMinutes: 52 + count * 3,
        totalVolumeKg: 3850 + count * 220,
        notes: 'Excelente congestión y bombeo.',
        completedExercises: [
          { name: 'Press de Banca Plano', sets: 4, reps: 10, weight: 70 },
          { name: 'Press Inclinado con Mancuernas', sets: 3, reps: 12, weight: 24 },
          { name: 'Elevaciones Laterales', sets: 4, reps: 15, weight: 10 }
        ]
      });
      count++;
    }
  }

  return history;
}

const DEFAULT_SETTINGS = {
  // Días de entrenamiento activos: 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes
  scheduledDays: [1, 2, 3, 4, 5],
  weightUnit: 'kg', // 'kg' o 'lbs'
  restTimerSeconds: 90,
  soundAlerts: true,
  enableStreakFreeze: false // Modo estricto por defecto
};
