/**
 * BlychGym - Motor de Rachas Personalizadas
 * 
 * Lógica matemática para calcular la racha de entrenamientos basada
 * estrictamente en los días de la semana configurados por el usuario.
 * Los días de descanso programados NO penalizan ni rompen la racha.
 */

// Convierte objeto Date a string 'YYYY-MM-DD' en hora local
function toDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Obtiene el día de la semana en formato 1 (Lunes) a 7 (Domingo)
function getDayOfWeek(date) {
  const d = new Date(date);
  const jsDay = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  return jsDay === 0 ? 7 : jsDay;
}

// Crea una fecha a partir de 'YYYY-MM-DD' en hora local (evita desfaces UTC)
function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

// Suma o resta días a una fecha
function addDays(date, days) {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Calcula la racha actual, el récord histórico y las estadísticas de cumplimiento.
 * 
 * @param {Array<Object>} history - Lista de entrenamientos [{ date: 'YYYY-MM-DD', ... }]
 * @param {Array<number>} scheduledDays - Días activos configurados (1 = Lun, ..., 7 = Dom)
 * @param {Date|string} [referenceDate] - Fecha de referencia (por defecto hoy)
 * @returns {Object} { currentStreak, bestStreak, complianceRate, isTodayScheduled, isTodayCompleted, statusText }
 */
function calculateStreakStats(history = [], scheduledDays = [1, 2, 3, 4, 5], referenceDate = new Date()) {
  const today = typeof referenceDate === 'string' ? parseDateKey(referenceDate) : new Date(referenceDate);
  const todayKey = toDateKey(today);
  const todayDayOfWeek = getDayOfWeek(today);

  // Mapa de fechas completadas para búsqueda O(1)
  const completedDates = new Set(history.map(item => item.date));

  // Normalizar días configurados (ordenados y únicos)
  const activeDaysSet = new Set(scheduledDays);
  const isTodayScheduled = activeDaysSet.has(todayDayOfWeek);
  const isTodayCompleted = completedDates.has(todayKey);

  if (activeDaysSet.size === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      complianceRate: 0,
      isTodayScheduled: false,
      isTodayCompleted,
      statusText: 'No has seleccionado días de entrenamiento en tu horario.'
    };
  }

  // --- CALCULO DE RACHA ACTUAL ---
  // Partimos desde hoy hacia atrás.
  // Si hoy es día programado:
  //    - Si ya se entrenó hoy: contamos hoy y seguimos hacia atrás.
  //    - Si NO se ha entrenado hoy: hoy está pendiente, la racha previa sigue viva a la espera de hoy.
  // Si hoy NO es día programado (es descanso):
  //    - Buscamos el último día programado anterior para verificar si la racha venía activa.

  let currentStreak = 0;
  let checkDate = new Date(today);

  if (isTodayScheduled) {
    if (isTodayCompleted) {
      currentStreak = 1;
      checkDate = addDays(checkDate, -1);
    } else {
      // Hoy está pendiente. Comenzamos a evaluar desde ayer hacia atrás
      checkDate = addDays(checkDate, -1);
    }
  } else {
    // Hoy es descanso programado. Empezamos a evaluar desde el día anterior
    checkDate = addDays(checkDate, -1);
  }

  // Retrocedemos día a día buscando los días programados anteriores
  // Límite de seguridad: 365 días
  let safeLimit = 365;
  while (safeLimit-- > 0) {
    const dKey = toDateKey(checkDate);
    const dayOfWeek = getDayOfWeek(checkDate);

    if (activeDaysSet.has(dayOfWeek)) {
      // Es un día de entrenamiento programado
      if (completedDates.has(dKey)) {
        currentStreak++;
        checkDate = addDays(checkDate, -1);
      } else {
        // Encontró un día programado que NO se completó: aquí se rompe la racha actual
        break;
      }
    } else {
      // Es un día de descanso programado: SE SALTA SIN PENALIZACIÓN
      checkDate = addDays(checkDate, -1);
    }
  }

  // --- CALCULO DE RECORD HISTORICO (BEST STREAK) ---
  // Evaluamos toda la historia cronológica ordenada
  let bestStreak = currentStreak;
  if (history.length > 0) {
    // Ordenar fechas registradas
    const sortedHistoryDates = Array.from(completedDates).sort();
    if (sortedHistoryDates.length > 0) {
      const firstDate = parseDateKey(sortedHistoryDates[0]);
      let iterDate = new Date(firstDate);
      let runningStreak = 0;
      const endCalcDate = addDays(today, 1);

      while (iterDate < endCalcDate) {
        const iterKey = toDateKey(iterDate);
        const iterDayOfWeek = getDayOfWeek(iterDate);

        if (activeDaysSet.has(iterDayOfWeek)) {
          if (completedDates.has(iterKey)) {
            runningStreak++;
            if (runningStreak > bestStreak) {
              bestStreak = runningStreak;
            }
          } else {
            // Solo romper si iterDate es estrictamente anterior a hoy
            // (hoy puede estar pendiente)
            if (iterKey < todayKey) {
              runningStreak = 0;
            }
          }
        }
        // Si no es día programado, no afecta runningStreak
        iterDate = addDays(iterDate, 1);
      }
    }
  }

  // --- CALCULO DE TASA DE CUMPLIMIENTO (Últimos 30 días) ---
  let scheduledDaysCount30 = 0;
  let completedDaysCount30 = 0;
  for (let i = 0; i < 30; i++) {
    const pastDate = addDays(today, -i);
    const pastKey = toDateKey(pastDate);
    const pastDayOfWeek = getDayOfWeek(pastDate);

    if (activeDaysSet.has(pastDayOfWeek)) {
      scheduledDaysCount30++;
      if (completedDates.has(pastKey)) {
        completedDaysCount30++;
      }
    }
  }

  const complianceRate = scheduledDaysCount30 > 0
    ? Math.round((completedDaysCount30 / scheduledDaysCount30) * 100)
    : 100;

  // Texto de estado motivacional
  let statusText = '';
  if (isTodayScheduled) {
    if (isTodayCompleted) {
      statusText = '¡Entrenamiento de hoy completado! Racha en llamas 🔥';
    } else {
      statusText = '¡Hoy toca entrenar! Completa tu sesión para aumentar la racha.';
    }
  } else {
    statusText = 'Día de descanso programado. Tu racha está protegida y a salvo 🛡️';
  }

  return {
    currentStreak,
    bestStreak,
    complianceRate,
    isTodayScheduled,
    isTodayCompleted,
    statusText
  };
}

/**
 * Genera la información de la semana actual para la barra semanal
 */
function getWeekDaysOverview(history = [], scheduledDays = [1, 2, 3, 4, 5], referenceDate = new Date()) {
  const ref = typeof referenceDate === 'string' ? parseDateKey(referenceDate) : new Date(referenceDate);
  const currentDayOfWeek = getDayOfWeek(ref);
  const completedDates = new Set(history.map(item => item.date));
  const activeDaysSet = new Set(scheduledDays);

  // Calcular el Lunes de la semana actual
  const mondayOffset = -(currentDayOfWeek - 1);
  const monday = addDays(ref, mondayOffset);

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(monday, i);
    const dateKey = toDateKey(dayDate);
    const dayOfWeek = i + 1; // 1 = Lunes ... 7 = Domingo
    const isScheduled = activeDaysSet.has(dayOfWeek);
    const isCompleted = completedDates.has(dateKey);
    const isToday = dateKey === toDateKey(ref);
    const isPast = dateKey < toDateKey(ref);

    let status = 'rest'; // rest, completed, pending, missed
    if (isScheduled) {
      if (isCompleted) {
        status = 'completed';
      } else if (isToday) {
        status = 'pending';
      } else if (isPast) {
        status = 'missed';
      } else {
        status = 'upcoming';
      }
    } else {
      if (isCompleted) {
        status = 'bonus'; // Entrenó en día de descanso opcional
      } else {
        status = 'rest';
      }
    }

    weekDays.push({
      dayName: dayNames[i],
      dayNumber: dayDate.getDate(),
      dateKey,
      dayOfWeek,
      isScheduled,
      isCompleted,
      isToday,
      status
    });
  }

  return weekDays;
}

// Exportar para uso modular o global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toDateKey,
    getDayOfWeek,
    parseDateKey,
    addDays,
    calculateStreakStats,
    getWeekDaysOverview
  };
}
