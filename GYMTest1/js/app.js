/**
 * BlychGym - Controlador Principal de la Aplicación
 * Gestión de Estado, Rachas, Sesión Activa, Cronómetros, Calendario y Audio
 */

// Estado Global
const AppState = {
  scheduledDays: [1, 2, 3, 4, 5], // Por defecto Lunes a Viernes (1..5)
  weightUnit: 'kg',
  restTimerSeconds: 90,
  soundAlerts: true,
  history: [],
  routines: [],
  exercises: [],
  activeSession: null,
  activeSessionInterval: null,
  restTimerInterval: null,
  restTimerRemaining: 0,
  calendarCurrentDate: new Date()
};

// ==========================================================================
// Persistencia en LocalStorage
// ==========================================================================
const STORAGE_KEYS = {
  SCHEDULE: 'blychgym_scheduled_days',
  SETTINGS: 'blychgym_settings',
  HISTORY: 'blychgym_history',
  ROUTINES: 'blychgym_routines',
  EXERCISES: 'blychgym_exercises',
  ACTIVE_SESSION: 'blychgym_active_session'
};

function saveState() {
  localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(AppState.scheduledDays));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
    weightUnit: AppState.weightUnit,
    restTimerSeconds: AppState.restTimerSeconds,
    soundAlerts: AppState.soundAlerts
  }));
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(AppState.history));
  localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(AppState.routines));
  localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(AppState.exercises));
  if (AppState.activeSession) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(AppState.activeSession));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
}

function loadState() {
  const savedSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
  if (savedSchedule) {
    try { AppState.scheduledDays = JSON.parse(savedSchedule); } catch (e) {}
  } else {
    AppState.scheduledDays = [1, 2, 3, 4, 5];
  }

  const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (savedSettings) {
    try {
      const s = JSON.parse(savedSettings);
      AppState.weightUnit = s.weightUnit || 'kg';
      AppState.restTimerSeconds = s.restTimerSeconds || 90;
      AppState.soundAlerts = s.soundAlerts !== false;
    } catch (e) {}
  }

  const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (savedHistory) {
    try { AppState.history = JSON.parse(savedHistory); } catch (e) {}
  } else {
    // Cargar historial de demostración inicial
    AppState.history = generateInitialDemoHistory(AppState.scheduledDays);
  }

  const savedRoutines = localStorage.getItem(STORAGE_KEYS.ROUTINES);
  if (savedRoutines) {
    try { AppState.routines = JSON.parse(savedRoutines); } catch (e) {}
  } else {
    AppState.routines = [...DEFAULT_ROUTINES];
  }

  const savedExercises = localStorage.getItem(STORAGE_KEYS.EXERCISES);
  if (savedExercises) {
    try { AppState.exercises = JSON.parse(savedExercises); } catch (e) {}
  } else {
    AppState.exercises = [...DEFAULT_EXERCISES];
  }

  const savedActiveSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  if (savedActiveSession) {
    try { AppState.activeSession = JSON.parse(savedActiveSession); } catch (e) {}
  }
}

// ==========================================================================
// Síntesis de Audio (Web Audio API - Cero dependencias externas)
// ==========================================================================
function playSuccessBeep() {
  if (!AppState.soundAlerts) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Tono doble agradable (523.25Hz -> 659.25Hz -> 783.99Hz)
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.25);
    
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio no soportado o bloqueado por navegador', err);
  }
}

function playTimerFinishBeep() {
  if (!AppState.soundAlerts) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Tres bips rápidos para avisar que el descanso concluyó
    [0, 0.15, 0.3].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now + delay);
      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.1);
    });
  } catch (err) {}
}

// ==========================================================================
// Toast Notificaciones
// ==========================================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === 'fire') icon = '🔥';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// Actualización de Racha y Hero Banner
// ==========================================================================
function updateStreakAndHeroUI() {
  const stats = calculateStreakStats(AppState.history, AppState.scheduledDays);

  // Widget Header
  const streakCountHeader = document.getElementById('streakCountHeader');
  const streakLabelHeader = document.getElementById('streakLabelHeader');
  if (streakCountHeader) streakCountHeader.textContent = stats.currentStreak;
  if (streakLabelHeader) {
    streakLabelHeader.textContent = stats.isTodayScheduled
      ? (stats.isTodayCompleted ? '¡Racha al Día!' : 'Pendiente Hoy')
      : 'Descanso Seguro';
  }

  // Banner Hero
  const todayBadge = document.getElementById('todayStatusBadge');
  const todayHeadline = document.getElementById('todayHeadline');
  const todayExplanation = document.getElementById('todayExplanation');
  const todayDateReadable = document.getElementById('todayDateReadable');
  const btnHeroQuickStart = document.getElementById('btnHeroQuickStart');

  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const dateStr = now.toLocaleDateString('es-ES', options);
  if (todayDateReadable) {
    todayDateReadable.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  if (stats.isTodayScheduled) {
    if (stats.isTodayCompleted) {
      if (todayBadge) {
        todayBadge.className = 'badge-pill badge-completed';
        todayBadge.innerHTML = '<span>✅</span> ENTRENAMIENTO DE HOY COMPLETADO';
      }
      if (todayHeadline) todayHeadline.textContent = `¡Racha de ${stats.currentStreak} días asegurada! 🔥`;
      if (todayExplanation) {
        todayExplanation.textContent = 'Has cumplido tu sesión programada con éxito. Puedes revisar tu progreso o descansar.';
      }
      if (btnHeroQuickStart) {
        btnHeroQuickStart.innerHTML = '<span>📊</span> Ver Mi Progreso en Calendario';
        btnHeroQuickStart.onclick = () => switchTab('tab-calendar');
      }
    } else {
      if (todayBadge) {
        todayBadge.className = 'badge-pill badge-scheduled';
        todayBadge.innerHTML = '<span>⚡</span> HOY ES DÍA PROGRAMADO';
      }
      if (todayHeadline) todayHeadline.textContent = '¡Hoy toca darlo todo en el gimnasio!';
      if (todayExplanation) {
        todayExplanation.textContent = `Tu racha actual es de ${stats.currentStreak} días. Completa tu entrenamiento hoy para aumentar a ${stats.currentStreak + 1}.`;
      }
      if (btnHeroQuickStart) {
        btnHeroQuickStart.innerHTML = '<span>⚡</span> Iniciar Entrenamiento de Hoy';
        btnHeroQuickStart.onclick = () => {
          if (AppState.activeSession) {
            switchTab('tab-active-session');
          } else {
            startFirstAvailableRoutine();
          }
        };
      }
    }
  } else {
    // Es día de descanso programado
    if (todayBadge) {
      todayBadge.className = 'badge-pill badge-rest';
      todayBadge.innerHTML = '<span>🛡️</span> DÍA DE DESCANSO PROGRAMADO';
    }
    if (todayHeadline) todayHeadline.textContent = 'Día de Recuperación y Crecimiento';
    if (todayExplanation) {
      todayExplanation.textContent = `Tu racha de ${stats.currentStreak} días está 100% protegida. No necesitas entrenar hoy; tu racha continuará en tu próximo día configurado.`;
    }
    if (btnHeroQuickStart) {
      btnHeroQuickStart.innerHTML = '<span>💪</span> Entrenar de Todos Modos (Opcional)';
      btnHeroQuickStart.onclick = () => {
        if (AppState.activeSession) {
          switchTab('tab-active-session');
        } else {
          startFirstAvailableRoutine();
        }
      };
    }
  }

  // Tira Semanal (Weekly Strip)
  renderWeekStrip();

  // Tarjetas de Estadísticas en Pestaña 3
  const statsCurrentStreak = document.getElementById('statsCurrentStreak');
  const statsBestStreak = document.getElementById('statsBestStreak');
  const statsComplianceRate = document.getElementById('statsComplianceRate');
  const statsTotalSessions = document.getElementById('statsTotalSessions');

  if (statsCurrentStreak) statsCurrentStreak.textContent = stats.currentStreak;
  if (statsBestStreak) statsBestStreak.textContent = stats.bestStreak;
  if (statsComplianceRate) statsComplianceRate.textContent = `${stats.complianceRate}%`;
  if (statsTotalSessions) statsTotalSessions.textContent = AppState.history.length;
}

// ==========================================================================
// Renderizado de Tira Semanal (Weekly Strip)
// ==========================================================================
function renderWeekStrip() {
  const container = document.getElementById('weekDaysContainer');
  const infoEl = document.getElementById('weekScheduleInfo');
  if (!container) return;

  const weekDays = getWeekDaysOverview(AppState.history, AppState.scheduledDays);

  // Texto resumen de días
  const dayLabels = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };
  const activeLabelList = AppState.scheduledDays.map(d => dayLabels[d]).join(', ');
  if (infoEl) infoEl.textContent = `Días activos (${AppState.scheduledDays.length}d): ${activeLabelList}`;

  container.innerHTML = '';
  weekDays.forEach(day => {
    const cell = document.createElement('div');
    let cellClass = `week-day-cell status-${day.status}-cell`;
    if (day.isToday) cellClass += ' is-today';
    cell.className = cellClass;

    let icon = '•';
    let title = '';
    if (day.status === 'completed') {
      icon = '✓';
      title = 'Entrenamiento completado';
    } else if (day.status === 'rest') {
      icon = '🛡️';
      title = 'Descanso programado (no rompe racha)';
    } else if (day.status === 'pending') {
      icon = '⏳';
      title = 'Pendiente para hoy';
    } else if (day.status === 'missed') {
      icon = '✕';
      title = 'Día programado no registrado';
    } else if (day.status === 'bonus') {
      icon = '⭐';
      title = 'Entrenamiento en día de descanso';
    } else {
      icon = '○';
      title = 'Próximo día programado';
    }

    cell.title = `${day.dayName} ${day.dayNumber}: ${title}`;
    cell.innerHTML = `
      <span class="week-day-name">${day.dayName}</span>
      <span class="week-day-number">${day.dayNumber}</span>
      <div class="week-day-status-icon">${icon}</div>
    `;

    container.appendChild(cell);
  });
}

// ==========================================================================
// Navegación por Pestañas
// ==========================================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId);
  });

  if (tabId === 'tab-calendar') {
    renderCalendar();
    renderHistoryFeed();
  } else if (tabId === 'tab-stats') {
    renderPRs();
  }
}

// ==========================================================================
// Renderizado de Rutinas
// ==========================================================================
function renderRoutines() {
  const container = document.getElementById('routinesContainer');
  if (!container) return;

  container.innerHTML = '';
  AppState.routines.forEach(routine => {
    const card = document.createElement('div');
    card.className = 'routine-card';

    const exercisesHtml = routine.exercises.slice(0, 4).map(e => {
      const exObj = AppState.exercises.find(item => item.id === e.exerciseId);
      const name = exObj ? exObj.name : 'Ejercicio personalizado';
      return `
        <div class="routine-exercise-item">
          <span>${name}</span>
          <span class="routine-exercise-meta">${e.sets} x ${e.reps} (${e.targetWeight || 0} ${AppState.weightUnit})</span>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div>
        <div class="routine-card-header">
          <h3 class="routine-name">${routine.name}</h3>
        </div>
        <p class="routine-desc">${routine.description || 'Rutina diseñada para máxima eficiencia.'}</p>
        <div class="routine-exercises-list" style="margin-top: 14px;">
          ${exercisesHtml}
          ${routine.exercises.length > 4 ? `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center;">+ ${routine.exercises.length - 4} ejercicios más</div>` : ''}
        </div>
      </div>
      <div class="routine-card-footer">
        <button class="btn-start-routine" data-start-routine="${routine.id}">
          <span>⚡</span> Entrenar Rutina
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Eventos de botones
  container.querySelectorAll('[data-start-routine]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rId = e.currentTarget.getAttribute('data-start-routine');
      startSessionFromRoutine(rId);
    });
  });
}

function startFirstAvailableRoutine() {
  if (AppState.routines.length > 0) {
    startSessionFromRoutine(AppState.routines[0].id);
  } else {
    startQuickFreeSession();
  }
}

// ==========================================================================
// Modo Entrenamiento Activo (Live Session)
// ==========================================================================
function startSessionFromRoutine(routineId) {
  const routine = AppState.routines.find(r => r.id === routineId);
  if (!routine) return;

  const sessionExercises = routine.exercises.map(item => {
    const exObj = AppState.exercises.find(e => e.id === item.exerciseId);
    const sets = [];
    for (let i = 1; i <= item.sets; i++) {
      sets.push({
        setNumber: i,
        reps: item.reps,
        weight: item.targetWeight || 0,
        completed: false
      });
    }
    return {
      exerciseId: item.exerciseId,
      name: exObj ? exObj.name : 'Ejercicio',
      muscle: exObj ? exObj.muscle : '',
      sets
    };
  });

  AppState.activeSession = {
    routineId: routine.id,
    routineName: routine.name,
    startTime: Date.now(),
    exercises: sessionExercises
  };

  saveState();
  initActiveSessionView();
  switchTab('tab-active-session');
  showToast(`¡Sesión iniciada con ${routine.name}! Dale con todo 💪`);
}

function startQuickFreeSession() {
  AppState.activeSession = {
    routineId: 'free-session',
    routineName: 'Entrenamiento Libre',
    startTime: Date.now(),
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Press de Banca Plano',
        muscle: 'Pecho',
        sets: [
          { setNumber: 1, reps: 10, weight: 60, completed: false },
          { setNumber: 2, reps: 10, weight: 60, completed: false },
          { setNumber: 3, reps: 8, weight: 70, completed: false }
        ]
      }
    ]
  };

  saveState();
  initActiveSessionView();
  switchTab('tab-active-session');
  showToast('¡Sesión libre iniciada! Añade los ejercicios que gustes.');
}

function initActiveSessionView() {
  const noView = document.getElementById('noActiveSessionView');
  const actView = document.getElementById('activeSessionView');
  const indicator = document.getElementById('activeSessionIndicator');
  const nameEl = document.getElementById('activeSessionRoutineName');

  if (!AppState.activeSession) {
    if (noView) noView.style.display = 'block';
    if (actView) actView.style.display = 'none';
    if (indicator) indicator.style.display = 'none';
    if (AppState.activeSessionInterval) {
      clearInterval(AppState.activeSessionInterval);
      AppState.activeSessionInterval = null;
    }
    return;
  }

  if (noView) noView.style.display = 'none';
  if (actView) actView.style.display = 'flex';
  if (indicator) indicator.style.display = 'inline';
  if (nameEl) nameEl.textContent = AppState.activeSession.routineName;

  renderActiveExercises();

  // Iniciar timer de sesión
  if (AppState.activeSessionInterval) clearInterval(AppState.activeSessionInterval);
  updateSessionTimerText();
  AppState.activeSessionInterval = setInterval(updateSessionTimerText, 1000);
}

function updateSessionTimerText() {
  if (!AppState.activeSession) return;
  const elapsedSec = Math.floor((Date.now() - AppState.activeSession.startTime) / 1000);
  const minutes = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const seconds = String(elapsedSec % 60).padStart(2, '0');
  const timerText = document.getElementById('sessionTimerText');
  if (timerText) timerText.textContent = `${minutes}:${seconds}`;
}

function renderActiveExercises() {
  const container = document.getElementById('activeExercisesList');
  if (!container || !AppState.activeSession) return;

  container.innerHTML = '';
  AppState.activeSession.exercises.forEach((ex, exIndex) => {
    const card = document.createElement('div');
    card.className = 'exercise-workout-card';

    let setsRowsHtml = ex.sets.map((s, sIndex) => {
      return `
        <tr class="set-row ${s.completed ? 'is-done' : ''}">
          <td><span class="set-number-badge">#${s.setNumber}</span></td>
          <td>
            <input type="number" class="set-input-quick" value="${s.weight}" min="0" step="0.5" 
              data-ex="${exIndex}" data-set="${sIndex}" data-field="weight">
          </td>
          <td>
            <input type="number" class="set-input-quick" value="${s.reps}" min="1" max="100" 
              data-ex="${exIndex}" data-set="${sIndex}" data-field="reps">
          </td>
          <td>
            <button class="set-check-btn ${s.completed ? 'checked' : ''}" 
              data-check-set="${exIndex}_${sIndex}" title="${s.completed ? 'Serie completada' : 'Marcar completada'}">
              ✓
            </button>
          </td>
        </tr>
      `;
    }).join('');

    card.innerHTML = `
      <div class="exercise-workout-header">
        <div class="exercise-title-wrap">
          <span style="font-size: 1.3rem;">🏋️</span>
          <div>
            <h3 class="exercise-title">${ex.name}</h3>
            <span style="font-size: 0.75rem; color: var(--lime-primary);">${ex.muscle || 'Ejercicio'}</span>
          </div>
        </div>
        <button class="btn-icon" data-remove-ex="${exIndex}" title="Eliminar ejercicio de la sesión" style="width: 32px; height: 32px; color: var(--status-missed);">
          ✕
        </button>
      </div>

      <table class="sets-table">
        <thead>
          <tr>
            <th>Serie</th>
            <th>${AppState.weightUnit.toUpperCase()}</th>
            <th>Reps</th>
            <th>Listo</th>
          </tr>
        </thead>
        <tbody>
          ${setsRowsHtml}
        </tbody>
      </table>

      <div class="exercise-footer-actions">
        <button class="btn-add-set" data-add-set="${exIndex}">
          + Añadir Serie
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Eventos de inputs y checks
  container.querySelectorAll('.set-input-quick').forEach(input => {
    input.addEventListener('change', (e) => {
      const exIdx = parseInt(e.target.dataset.ex);
      const setIdx = parseInt(e.target.dataset.set);
      const field = e.target.dataset.field;
      const val = parseFloat(e.target.value) || 0;
      AppState.activeSession.exercises[exIdx].sets[setIdx][field] = val;
      saveState();
    });
  });

  container.querySelectorAll('[data-check-set]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const [exIdx, setIdx] = e.currentTarget.dataset.checkSet.split('_').map(Number);
      const targetSet = AppState.activeSession.exercises[exIdx].sets[setIdx];
      targetSet.completed = !targetSet.completed;

      if (targetSet.completed) {
        playSuccessBeep();
        // Iniciar automáticamente el temporizador de descanso
        startRestTimer(AppState.restTimerSeconds);
        showToast(`Serie #${targetSet.setNumber} completada. ¡Descanso iniciado!`);
      }

      saveState();
      renderActiveExercises();
    });
  });

  container.querySelectorAll('[data-add-set]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const exIdx = parseInt(e.currentTarget.dataset.addSet);
      const ex = AppState.activeSession.exercises[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        setNumber: ex.sets.length + 1,
        reps: lastSet ? lastSet.reps : 10,
        weight: lastSet ? lastSet.weight : 50,
        completed: false
      });
      saveState();
      renderActiveExercises();
    });
  });

  container.querySelectorAll('[data-remove-ex]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const exIdx = parseInt(e.currentTarget.dataset.removeEx);
      AppState.activeSession.exercises.splice(exIdx, 1);
      saveState();
      renderActiveExercises();
    });
  });
}

// ==========================================================================
// Temporizador de Descanso (Rest Timer)
// ==========================================================================
function startRestTimer(seconds) {
  if (AppState.restTimerInterval) clearInterval(AppState.restTimerInterval);
  AppState.restTimerRemaining = seconds;
  updateRestTimerUI();

  AppState.restTimerInterval = setInterval(() => {
    AppState.restTimerRemaining--;
    updateRestTimerUI();

    if (AppState.restTimerRemaining <= 0) {
      clearInterval(AppState.restTimerInterval);
      AppState.restTimerInterval = null;
      playTimerFinishBeep();
      showToast('⏰ ¡Tiempo de descanso terminado! A por la siguiente serie 🔥', 'fire');
    }
  }, 1000);
}

function updateRestTimerUI() {
  const display = document.getElementById('restTimerDisplay');
  if (!display) return;
  const mins = String(Math.floor(AppState.restTimerRemaining / 60)).padStart(2, '0');
  const secs = String(AppState.restTimerRemaining % 60).padStart(2, '0');
  display.textContent = `${mins}:${secs}`;
}

// ==========================================================================
// Finalización y Guardado de Sesión
// ==========================================================================
function finishCurrentSession() {
  if (!AppState.activeSession) return;

  const session = AppState.activeSession;
  const durationSec = Math.floor((Date.now() - session.startTime) / 1000);
  const durationMinutes = Math.max(1, Math.round(durationSec / 60));
  const todayKey = toDateKey(new Date());

  // Calcular volumen total levantado
  let totalVolume = 0;
  let completedExercisesSummary = [];

  session.exercises.forEach(ex => {
    let completedSets = ex.sets.filter(s => s.completed);
    if (completedSets.length === 0) completedSets = ex.sets; // Si no marcó, toma las registradas

    completedSets.forEach(s => {
      totalVolume += (s.weight || 0) * (s.reps || 0);
    });

    completedExercisesSummary.push({
      name: ex.name,
      sets: completedSets.length,
      reps: completedSets[0] ? completedSets[0].reps : 10,
      weight: completedSets[0] ? completedSets[0].weight : 0
    });
  });

  // Guardar en historial
  const newHistoryItem = {
    id: 'hist_' + Date.now(),
    date: todayKey,
    routineName: session.routineName,
    durationMinutes,
    totalVolumeKg: Math.round(totalVolume),
    completedExercises: completedExercisesSummary,
    timestamp: Date.now()
  };

  // Reemplazar si ya había una hoy o añadir
  const existingIndex = AppState.history.findIndex(item => item.date === todayKey);
  if (existingIndex >= 0) {
    AppState.history[existingIndex] = newHistoryItem;
  } else {
    AppState.history.unshift(newHistoryItem);
  }

  // Limpiar sesión activa
  AppState.activeSession = null;
  if (AppState.activeSessionInterval) {
    clearInterval(AppState.activeSessionInterval);
    AppState.activeSessionInterval = null;
  }
  if (AppState.restTimerInterval) {
    clearInterval(AppState.restTimerInterval);
    AppState.restTimerInterval = null;
  }

  saveState();
  initActiveSessionView();

  // Calcular nueva racha y festejar
  const streakStats = calculateStreakStats(AppState.history, AppState.scheduledDays);
  updateStreakAndHeroUI();
  switchTab('tab-calendar');

  // Mostrar modal de celebración si incrementó racha
  openCelebrationModal(streakStats.currentStreak);
}

function openCelebrationModal(streakCount) {
  const modal = document.getElementById('modalCelebration');
  const countEl = document.getElementById('celebrationStreakNumber');
  const msgEl = document.getElementById('celebrationMessage');

  if (countEl) countEl.textContent = streakCount;
  if (msgEl) {
    msgEl.textContent = `¡Excelente sesión completada! Tu racha en tus días programados ahora es de ${streakCount} días consecutivos.`;
  }
  if (modal) modal.classList.add('active');
  playSuccessBeep();
}

// ==========================================================================
// Calendario Mensual Interactivo
// ==========================================================================
function renderCalendar() {
  const grid = document.getElementById('calendarDaysGrid');
  const title = document.getElementById('calendarMonthTitle');
  if (!grid || !title) return;

  const currentMonthDate = AppState.calendarCurrentDate;
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  title.textContent = `${monthNames[month]} ${year}`;

  grid.innerHTML = '';

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Día de la semana del primer día (1 = Lunes, ..., 7 = Domingo)
  const firstDayOfWeek = getDayOfWeek(firstDayOfMonth);
  const activeSet = new Set(AppState.scheduledDays);
  const completedMap = new Map(AppState.history.map(item => [item.date, item]));
  const todayKey = toDateKey(new Date());

  // Rellenar días del mes anterior
  for (let i = 1; i < firstDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day-cell cal-other-month';
    grid.appendChild(emptyCell);
  }

  // Rellenar días del mes
  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(year, month, d, 12, 0, 0);
    const dateKey = toDateKey(dayDate);
    const dayOfWeek = getDayOfWeek(dayDate);
    const isScheduled = activeSet.has(dayOfWeek);
    const isCompleted = completedMap.has(dateKey);
    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;

    const cell = document.createElement('div');
    let cellClass = 'cal-day-cell';
    let statusDot = '';

    if (isCompleted) {
      cellClass += ' status-completed';
      statusDot = '<div class="cal-dot-status" title="Entrenado"></div>';
    } else if (isScheduled) {
      if (isPast) {
        cellClass += ' status-missed';
        statusDot = '<div class="cal-dot-status" title="Día programado no asistido"></div>';
      } else if (isToday) {
        cellClass += ' status-pending';
        statusDot = '<div class="cal-dot-status" style="background: var(--status-pending);" title="Pendiente hoy"></div>';
      }
    } else {
      // Día de descanso programado
      cellClass += ' status-rest';
      statusDot = '<div class="cal-dot-status" title="Descanso programado (Protegido)"></div>';
    }

    if (isToday) cellClass += ' cal-today';

    cell.className = cellClass;
    cell.innerHTML = `
      <span class="cal-num">${d}</span>
      ${statusDot}
    `;

    cell.addEventListener('click', () => {
      openDayDetailModal(dateKey, isCompleted ? completedMap.get(dateKey) : null, isScheduled, isToday);
    });

    grid.appendChild(cell);
  }
}

function openDayDetailModal(dateKey, sessionItem, isScheduled, isToday) {
  const modal = document.getElementById('modalSessionDetail');
  const title = document.getElementById('detailModalTitle');
  const content = document.getElementById('detailModalContent');
  if (!modal || !content) return;

  const dateObj = parseDateKey(dateKey);
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('es-ES', options);
  title.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  if (sessionItem) {
    const exList = sessionItem.completedExercises.map(e => `
      <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-glass);">
        <span><strong>${e.name}</strong></span>
        <span style="color: var(--lime-primary);">${e.sets} series × ${e.reps} reps (${e.weight} ${AppState.weightUnit})</span>
      </li>
    `).join('');

    content.innerHTML = `
      <div style="background: var(--lime-soft); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
        <div style="font-size: 1.1rem; font-weight: 800; color: #4ade80;">✓ ${sessionItem.routineName}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          ⏱️ Duración: ${sessionItem.durationMinutes} min &nbsp;|&nbsp; 🏋️ Volumen: ${sessionItem.totalVolumeKg} ${AppState.weightUnit}
        </div>
      </div>
      <h4 style="font-family: var(--font-heading); font-size: 0.95rem; margin-bottom: 8px;">Ejercicios Realizados:</h4>
      <ul style="list-style: none; padding: 0;">${exList}</ul>
    `;
  } else if (isScheduled) {
    content.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 14px;">
        <h4 style="color: #f87171; font-family: var(--font-heading);">Día de Entrenamiento Programado</h4>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 6px;">
          ${isToday ? '¡Aún estás a tiempo de entrenar hoy y mantener tu racha!' : 'Este día formaba parte de tu horario y no se registró sesión.'}
        </p>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div style="background: var(--cyan-soft); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 14px;">
        <h4 style="color: var(--cyan-primary); font-family: var(--font-heading);">🛡️ Descanso Programado (Protegido)</h4>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 6px;">
          Este día no forma parte de tus días de entrenamiento configurados. Tu racha se mantuvo intacta y protegida.
        </p>
      </div>
    `;
  }

  modal.classList.add('active');
}

function renderHistoryFeed() {
  const container = document.getElementById('historyFeedContainer');
  if (!container) return;

  container.innerHTML = '';
  if (AppState.history.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No hay entrenamientos registrados aún.</p>';
    return;
  }

  AppState.history.slice(0, 10).forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-meta-left">
        <div style="font-size: 1.5rem;">⚡</div>
        <div>
          <div class="history-routine-title">${item.routineName}</div>
          <div class="history-date">${item.date}</div>
        </div>
      </div>
      <div class="history-stats-right">
        <span style="color: var(--text-secondary);">⏱️ ${item.durationMinutes} min</span>
        <span style="color: var(--lime-primary); font-weight: 700;">🏋️ ${item.totalVolumeKg || 0} ${AppState.weightUnit}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// Renderizado de Récords Personales (PRs)
// ==========================================================================
function renderPRs() {
  const container = document.getElementById('prCardsContainer');
  if (!container) return;

  // Calcular pesos máximos registrados en el historial
  const prMap = {};
  AppState.history.forEach(item => {
    if (item.completedExercises) {
      item.completedExercises.forEach(ex => {
        if (!prMap[ex.name] || ex.weight > prMap[ex.name]) {
          prMap[ex.name] = ex.weight;
        }
      });
    }
  });

  // Ejercicios clave si no hay datos
  const keyExercises = ['Press de Banca Plano', 'Sentadilla Trasera con Barra', 'Remo con Barra 90°', 'Press Militar de Pie'];
  keyExercises.forEach(key => {
    if (!prMap[key]) prMap[key] = key === 'Press de Banca Plano' ? 70 : (key === 'Sentadilla Trasera con Barra' ? 90 : 50);
  });

  container.innerHTML = '';
  Object.keys(prMap).forEach(exName => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-icon-wrapper" style="background: rgba(234, 179, 8, 0.15); color: #eab308;">
        🏆
      </div>
      <div class="stat-info">
        <span class="stat-label">${exName}</span>
        <span class="stat-value">${prMap[exName]} <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">${AppState.weightUnit}</span></span>
        <span class="stat-subtext">Récord Personal Registrado</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// Modal de Selección de Ejercicios para Sesión Activa
// ==========================================================================
function openCatalogueModal() {
  const modal = document.getElementById('modalAddExercise');
  if (!modal) return;
  renderCatalogueList();
  modal.classList.add('active');
}

function renderCatalogueList(filterMuscle = 'all', searchQuery = '') {
  const container = document.getElementById('exerciseCatalogueList');
  if (!container) return;

  const filtered = AppState.exercises.filter(ex => {
    const matchMuscle = filterMuscle === 'all' || ex.muscle === filterMuscle;
    const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMuscle && matchSearch;
  });

  container.innerHTML = '';
  filtered.forEach(ex => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.padding = '10px 14px';
    item.style.background = 'var(--bg-surface)';
    item.style.border = '1px solid var(--border-glass)';
    item.style.borderRadius = 'var(--radius-sm)';

    item.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #fff;">${ex.icon} ${ex.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-secondary);">${ex.muscle} • ${ex.equipment}</div>
      </div>
      <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" data-choose-ex="${ex.id}">
        + Añadir
      </button>
    `;

    container.appendChild(item);
  });

  container.querySelectorAll('[data-choose-ex]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const exId = e.currentTarget.getAttribute('data-choose-ex');
      const exObj = AppState.exercises.find(i => i.id === exId);
      if (exObj && AppState.activeSession) {
        AppState.activeSession.exercises.push({
          exerciseId: exObj.id,
          name: exObj.name,
          muscle: exObj.muscle,
          sets: [
            { setNumber: 1, reps: 10, weight: 50, completed: false },
            { setNumber: 2, reps: 10, weight: 50, completed: false },
            { setNumber: 3, reps: 10, weight: 50, completed: false }
          ]
        });
        saveState();
        renderActiveExercises();
        document.getElementById('modalAddExercise').classList.remove('active');
        showToast(`Se añadió "${exObj.name}" a la sesión.`);
      }
    });
  });
}

// ==========================================================================
// Configuración de Horarios & Event Listeners
// ==========================================================================
function setupEventListeners() {
  // Tabs Navigation
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Modal Closers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    });
  });

  // Header and Hero Modals
  document.getElementById('btnOpenScheduleModal')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('btnQuickConfigDays')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('headerStreakBadge')?.addEventListener('click', () => switchTab('tab-calendar'));

  document.getElementById('btnOpenSettingsModal')?.addEventListener('click', () => {
    document.getElementById('modalSettings').classList.add('active');
  });

  // Form Horario
  document.getElementById('formScheduleSettings')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const checkedDays = [];
    for (let i = 1; i <= 7; i++) {
      const chk = document.getElementById(`day-${i}`);
      if (chk && chk.checked) checkedDays.push(i);
    }

    if (checkedDays.length === 0) {
      alert('Debes seleccionar al menos un día de entrenamiento a la semana.');
      return;
    }

    AppState.scheduledDays = checkedDays;
    saveState();
    updateStreakAndHeroUI();
    document.getElementById('modalSchedule').classList.remove('active');
    showToast('¡Horario guardado! Tu racha ahora se calcula con tus nuevos días.', 'fire');
  });

  // Presets de horario
  document.getElementById('btnPresetMonFri')?.addEventListener('click', () => {
    [1, 2, 3, 4, 5].forEach(d => { document.getElementById(`day-${d}`).checked = true; });
    [6, 7].forEach(d => { document.getElementById(`day-${d}`).checked = false; });
  });
  document.getElementById('btnPresetMonWedFri')?.addEventListener('click', () => {
    [1, 3, 5].forEach(d => { document.getElementById(`day-${d}`).checked = true; });
    [2, 4, 6, 7].forEach(d => { document.getElementById(`day-${d}`).checked = false; });
  });
  document.getElementById('btnPresetAllDays')?.addEventListener('click', () => {
    for (let i = 1; i <= 7; i++) document.getElementById(`day-${i}`).checked = true;
  });

  // Sesión Activa
  document.getElementById('btnStartQuickFreeSession')?.addEventListener('click', startQuickFreeSession);
  document.getElementById('btnAddExerciseToSession')?.addEventListener('click', openCatalogueModal);
  document.getElementById('btnFinishSession')?.addEventListener('click', finishCurrentSession);
  document.getElementById('btnCancelSession')?.addEventListener('click', () => {
    if (confirm('¿Deseas cancelar el entrenamiento en curso? Los cambios no se guardarán.')) {
      AppState.activeSession = null;
      saveState();
      initActiveSessionView();
      switchTab('tab-routines');
    }
  });

  // Rest Timer Controls
  document.getElementById('btnStartRestTimer')?.addEventListener('click', () => {
    startRestTimer(AppState.restTimerSeconds);
  });
  document.getElementById('btnSkipRestTimer')?.addEventListener('click', () => {
    if (AppState.restTimerInterval) {
      clearInterval(AppState.restTimerInterval);
      AppState.restTimerInterval = null;
    }
    AppState.restTimerRemaining = 0;
    updateRestTimerUI();
    showToast('Descanso omitido.');
  });
  document.querySelectorAll('.btn-timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = parseInt(btn.dataset.seconds);
      startRestTimer(sec);
    });
  });
  document.getElementById('btnToggleSound')?.addEventListener('click', () => {
    AppState.soundAlerts = !AppState.soundAlerts;
    saveState();
    showToast(AppState.soundAlerts ? 'Sonido activado 🔔' : 'Sonido silenciado 🔕', 'info');
  });

  // Calendario Nav
  document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
    AppState.calendarCurrentDate.setMonth(AppState.calendarCurrentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('btnNextMonth')?.addEventListener('click', () => {
    AppState.calendarCurrentDate.setMonth(AppState.calendarCurrentDate.getMonth() + 1);
    renderCalendar();
  });

  // Filtros del catálogo
  document.getElementById('exerciseSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value;
    const activeMuscle = document.querySelector('#muscleFilterChips .active')?.dataset.muscle || 'all';
    renderCatalogueList(activeMuscle, q);
  });
  document.querySelectorAll('#muscleFilterChips button').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#muscleFilterChips button').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const q = document.getElementById('exerciseSearchInput')?.value || '';
      renderCatalogueList(chip.dataset.muscle, q);
    });
  });

  // Ajustes de Peso y Respaldo
  const selectWeight = document.getElementById('selectWeightUnit');
  if (selectWeight) {
    selectWeight.value = AppState.weightUnit;
    selectWeight.addEventListener('change', (e) => {
      AppState.weightUnit = e.target.value;
      saveState();
      renderRoutines();
      renderActiveExercises();
      showToast(`Unidad de peso cambiada a ${AppState.weightUnit.toUpperCase()}`);
    });
  }

  const selectRest = document.getElementById('selectDefaultRest');
  if (selectRest) {
    selectRest.value = String(AppState.restTimerSeconds);
    selectRest.addEventListener('change', (e) => {
      AppState.restTimerSeconds = parseInt(e.target.value);
      saveState();
    });
  }

  // Exportar / Importar JSON
  document.getElementById('btnExportJson')?.addEventListener('click', exportDataJson);
  document.getElementById('fileImportJson')?.addEventListener('change', importDataJson);
  document.getElementById('btnResetData')?.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas reiniciar todos tus datos de BlychGym? Se borrará el historial y volverá a los valores iniciales.')) {
      localStorage.clear();
      location.reload();
    }
  });
}

function openScheduleModal() {
  const modal = document.getElementById('modalSchedule');
  if (!modal) return;
  for (let i = 1; i <= 7; i++) {
    const chk = document.getElementById(`day-${i}`);
    if (chk) chk.checked = AppState.scheduledDays.includes(i);
  }
  modal.classList.add('active');
}

function exportDataJson() {
  const backup = {
    appName: 'BlychGym',
    version: '1.0',
    exportDate: new Date().toISOString(),
    scheduledDays: AppState.scheduledDays,
    weightUnit: AppState.weightUnit,
    restTimerSeconds: AppState.restTimerSeconds,
    history: AppState.history,
    routines: AppState.routines,
    exercises: AppState.exercises
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `blychgym-backup-${toDateKey(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Copia de seguridad descargada exitosamente.');
}

function importDataJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.scheduledDays) AppState.scheduledDays = data.scheduledDays;
      if (data.weightUnit) AppState.weightUnit = data.weightUnit;
      if (data.history) AppState.history = data.history;
      if (data.routines) AppState.routines = data.routines;
      saveState();
      updateStreakAndHeroUI();
      renderRoutines();
      renderCalendar();
      showToast('¡Datos restaurados con éxito! Todo actualizado.');
      document.getElementById('modalSettings').classList.remove('active');
    } catch (err) {
      alert('Error al leer el archivo JSON: formato inválido.');
    }
  };
  reader.readAsText(file);
}

// ==========================================================================
// Inicialización
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  updateStreakAndHeroUI();
  renderRoutines();
  initActiveSessionView();
  renderCalendar();
  renderHistoryFeed();
});
