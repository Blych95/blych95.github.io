document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('workout-form');
    const recordsList = document.getElementById('records-list');

    // Cargar los registros guardados al abrir la página
    loadRecords();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const day = document.getElementById('day').value;
        const exercise = document.getElementById('exercise').value;
        const sets = document.getElementById('sets').value;
        const reps = document.getElementById('reps').value;
        const weight = document.getElementById('weight').value;

        const guideFile = document.getElementById('guide-media').files[0];
        const progressFile = document.getElementById('progress-media').files[0];

        // Convertimos los archivos multimedia a Base64 para guardarlos en LocalStorage
        const guideBase64 = guideFile ? await toBase64(guideFile) : null;
        const progressBase64 = progressFile ? await toBase64(progressFile) : null;

        const newRecord = {
            id: Date.now(), // ID único
            day,
            exercise,
            sets,
            reps,
            weight,
            guideMedia: guideBase64,
            guideIsVideo: guideFile && guideFile.type.startsWith('video'),
            progressMedia: progressBase64
        };

        const records = getRecords();
        records.push(newRecord);
        
        try {
            localStorage.setItem('workoutRecords', JSON.stringify(records));
        } catch (error) {
            alert('El archivo es demasiado grande. Intenta con fotos/videos más cortos.');
            return;
        }

        form.reset();
        loadRecords();
    });

    function getRecords() {
        const records = localStorage.getItem('workoutRecords');
        return records ? JSON.parse(records) : [];
    }

    function loadRecords() {
        recordsList.innerHTML = '';
        const records = getRecords();

        records.forEach(record => {
            const card = document.createElement('div');
            card.className = 'record-card';

            let mediaHTML = '<div class="media-container">';
            
            if (record.guideMedia) {
                mediaHTML += `<p><small>📌 Guía de ejecución:</small></p>`;
                mediaHTML += record.guideIsVideo
                    ? `<video src="${record.guideMedia}" controls></video>`
                    : `<img src="${record.guideMedia}" alt="Guía">`;
            }
            
            if (record.progressMedia) {
                mediaHTML += `<p><small>📸 Mi Avance:</small></p>`;
                mediaHTML += `<img src="${record.progressMedia}" alt="Progreso">`;
            }
            mediaHTML += '</div>';

            card.innerHTML = `
                <h3>${record.exercise}</h3>
                <p><strong>Día:</strong> ${record.day}</p>
                <p><strong>Rendimiento:</strong> ${record.sets} Series x ${record.reps} Reps</p>
                <p><strong>Peso levantado:</strong> ${record.weight} kg</p>
                ${mediaHTML}
                <button class="btn-delete" onclick="deleteRecord(${record.id})">Eliminar Registro</button>
            `;
            recordsList.appendChild(card);
        });
    }

    // Función auxiliar para leer los archivos
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Función global para eliminar una tarjeta
    window.deleteRecord = function(id) {
        let records = getRecords();
        records = records.filter(r => r.id !== id);
        localStorage.setItem('workoutRecords', JSON.stringify(records));
        loadRecords();
    }
});
