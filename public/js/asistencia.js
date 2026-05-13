/**
 * asistencia.js — Logic for Attendance view
 */

const AsistenciaPage = {
    jugadoresList: [],
    attendanceMap: {},

    init: async () => {
        const user = await App.loadUserInfo();
        AsistenciaPage.renderLayout(user);
        AsistenciaPage.bindEvents();
        await AsistenciaPage.loadCategorias();
        await AsistenciaPage.loadJugadoresForAttendance();
    },

    renderLayout: (user) => {
        const layout = document.getElementById('appLayout');
        layout.innerHTML = `
            ${App.renderSidebar(user.nombre, user.rol)}
            <main class="main-content">
                <div class="top-bar">
                    <div><button class="menu-toggle"><i class="bi bi-list"></i></button></div>
                    <div>
                        <h4>Control de Asistencia</h4>
                        <div class="breadcrumb">Registro y gestión de asistencia</div>
                    </div>
                    <div>
                        <a href="/dashboard" class="btn-secondary-custom"><i class="bi bi-arrow-left"></i> Volver</a>
                    </div>
                </div>
                <div class="content-area">
                    <div class="data-card mb-4 fade-in">
                        <div class="data-card-body p-2">
                            <div class="d-flex gap-2">
                                <button class="btn-primary-custom tab-btn active" id="tab-register">
                                    <i class="bi bi-pencil-square"></i> Tomar Asistencia
                                </button>
                                <button class="btn-secondary-custom tab-btn" id="tab-history">
                                    <i class="bi bi-clock-history"></i> Historial
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="registerTab">
                        <div class="data-card mb-4 fade-in">
                            <div class="data-card-header">
                                <h5><i class="bi bi-calendar-check-fill me-2 text-primary"></i> Registrar Asistencia</h5>
                            </div>
                            <div class="data-card-body">
                                <div class="row g-3 mb-4">
                                    <div class="col-md-4">
                                        <label class="form-label-custom">Fecha del entrenamiento *</label>
                                        <input type="date" id="attendanceDate" class="form-control-custom" value="${Utils.getTodayStr()}">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label-custom">Filtrar por categoría</label>
                                        <select id="attendanceCategoria" class="form-select-custom">
                                            <option value="">Todas las categorías</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 d-flex align-items-end">
                                        <button class="btn-secondary-custom w-100 justify-content-center" id="btn-load-existing">
                                            <i class="bi bi-arrow-clockwise"></i> Cargar existente
                                        </button>
                                    </div>
                                </div>

                                <div class="d-flex gap-2 mb-3">
                                    <button class="btn-secondary-custom btn-sm" id="btn-mark-all-present"><i class="bi bi-check-all"></i> Todos presentes</button>
                                    <button class="btn-secondary-custom btn-sm" id="btn-mark-all-absent"><i class="bi bi-x-circle"></i> Todos ausentes</button>
                                </div>

                                <div id="attendanceList"></div>

                                <div class="mt-4 text-end" id="saveSection" style="display:none">
                                    <button class="btn-primary-custom" id="btn-save-attendance">
                                        <i class="bi bi-check-circle"></i> Guardar Asistencia
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="historyTab" style="display:none">
                        <div class="data-card fade-in">
                            <div class="data-card-header d-flex justify-content-between align-items-center">
                                <h5><i class="bi bi-clock-history me-2 text-secondary"></i> Historial</h5>
                                <div class="d-flex gap-2">
                                    <input type="date" id="historyDate" class="form-control-custom" value="${Utils.getTodayStr()}">
                                    <select id="historyCat" class="form-select-custom">
                                        <option value="">Todas las categorías</option>
                                    </select>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table-custom">
                                    <thead>
                                        <tr><th>Jugador</th><th>Categoría</th><th>Estado</th><th>Observación</th></tr>
                                    </thead>
                                    <tbody id="historyBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },

    bindEvents: () => {
        document.getElementById('tab-register').addEventListener('click', (e) => AsistenciaPage.switchTab('register', e.target));
        document.getElementById('tab-history').addEventListener('click', (e) => AsistenciaPage.switchTab('history', e.target));
        document.getElementById('attendanceCategoria').addEventListener('change', AsistenciaPage.loadJugadoresForAttendance);
        document.getElementById('btn-load-existing').addEventListener('click', AsistenciaPage.loadExistingAttendance);
        document.getElementById('btn-mark-all-present').addEventListener('click', () => AsistenciaPage.markAll('presente'));
        document.getElementById('btn-mark-all-absent').addEventListener('click', () => AsistenciaPage.markAll('ausente'));
        document.getElementById('btn-save-attendance').addEventListener('click', AsistenciaPage.saveAttendance);
        document.getElementById('historyDate').addEventListener('change', AsistenciaPage.loadHistory);
        document.getElementById('historyCat').addEventListener('change', AsistenciaPage.loadHistory);
    },

    switchTab: (tab, btn) => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b === btn);
            b.classList.toggle('btn-primary-custom', b === btn);
            b.classList.toggle('btn-secondary-custom', b !== btn);
        });
        document.getElementById('registerTab').style.display = tab === 'register' ? 'block' : 'none';
        document.getElementById('historyTab').style.display = tab === 'history' ? 'block' : 'none';
        if (tab === 'history') AsistenciaPage.loadHistory();
    },

    loadCategorias: async () => {
        try {
            const data = await API.getCategories();
            if (data?.success) {
                const selects = ['attendanceCategoria', 'historyCat'];
                selects.forEach(id => {
                    const select = document.getElementById(id);
                    data.data.forEach(cat => {
                        const opt = new Option(cat.nombre, cat.id);
                        select.add(opt);
                    });
                });
            }
        } catch (e) {
            console.error('Error loading categories:', e);
        }
    },

    loadJugadoresForAttendance: async () => {
        const catId = document.getElementById('attendanceCategoria').value;
        try {
            const data = await API.getPlayers({ limit: 200, categoria_id: catId });
            if (data?.success) {
                AsistenciaPage.jugadoresList = data.data;
                AsistenciaPage.renderAttendanceList();
            }
        } catch (e) {
            console.error('Error loading players:', e);
        }
    },

    renderAttendanceList: () => {
        const container = document.getElementById('attendanceList');
        const saveSection = document.getElementById('saveSection');

        if (!AsistenciaPage.jugadoresList.length) {
            container.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><h5>Sin jugadores</h5><p>No hay jugadores en esta categoría</p></div>`;
            saveSection.style.display = 'none';
            return;
        }

        saveSection.style.display = 'block';
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table-custom">
                    <thead><tr><th>Jugador</th><th>Categoría</th><th class="text-center">Estado</th></tr></thead>
                    <tbody>
                        ${AsistenciaPage.jugadoresList.map(j => {
                            const state = AsistenciaPage.attendanceMap[j.id] || 'presente';
                            return `
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            ${j.foto ? `<img src="${j.foto}" class="player-avatar">` : `<div class="player-avatar-placeholder">${j.nombre[0]}</div>`}
                                            <span class="fw-bold">${Utils.escapeHtml(j.nombre)}</span>
                                        </div>
                                    </td>
                                    <td><span class="badge-custom green">${j.categoria?.nombre || 'N/A'}</span></td>
                                    <td>
                                        <div class="d-flex gap-1 justify-content-center flex-wrap">
                                            ${['presente', 'ausente', 'tardanza', 'justificado'].map(s => `
                                                <span class="attendance-badge ${s} ${state === s ? 'selected' : ''}" 
                                                      onclick="AsistenciaPage.setAttendance(${j.id}, '${s}', this)">
                                                    <i class="bi ${AsistenciaPage.getStateIcon(s)}"></i> ${s.charAt(0).toUpperCase() + s.slice(1)}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        AsistenciaPage.jugadoresList.forEach(j => {
            if (!AsistenciaPage.attendanceMap[j.id]) AsistenciaPage.attendanceMap[j.id] = 'presente';
        });
    },

    getStateIcon: (state) => {
        const icons = { presente: 'bi-check-circle', ausente: 'bi-x-circle', tardanza: 'bi-clock', justificado: 'bi-file-text' };
        return icons[state] || 'bi-circle';
    },

    setAttendance: (id, state, el) => {
        AsistenciaPage.attendanceMap[id] = state;
        el.closest('td').querySelectorAll('.attendance-badge').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
    },

    markAll: (state) => {
        AsistenciaPage.jugadoresList.forEach(j => AsistenciaPage.attendanceMap[j.id] = state);
        AsistenciaPage.renderAttendanceList();
    },

    loadExistingAttendance: async () => {
        const fecha = document.getElementById('attendanceDate').value;
        const catId = document.getElementById('attendanceCategoria').value;
        if (!fecha) return Utils.showToast('Selecciona una fecha', 'warning');

        try {
            const data = await API.getAttendanceByDate(fecha, catId);
            if (data?.success) {
                AsistenciaPage.attendanceMap = {};
                data.data.forEach(a => AsistenciaPage.attendanceMap[a.jugador_id] = a.estado);
                AsistenciaPage.renderAttendanceList();
                Utils.showToast(`${data.data.length} registros cargados`);
            }
        } catch (e) {
            console.error(e);
        }
    },

    saveAttendance: async () => {
        const fecha = document.getElementById('attendanceDate').value;
        if (!fecha) return Utils.showToast('Selecciona una fecha', 'warning');

        const asistencias = Object.entries(AsistenciaPage.attendanceMap).map(([id, state]) => ({
            jugador_id: parseInt(id),
            estado: state
        }));

        if (!asistencias.length) return Utils.showToast('No hay jugadores para registrar', 'warning');

        try {
            const data = await API.saveAttendance(fecha, asistencias);
            if (data?.success) Utils.showToast('Asistencia guardada exitosamente');
        } catch (e) {
            Utils.showToast(e.message, 'error');
        }
    },

    loadHistory: async () => {
        const fecha = document.getElementById('historyDate').value;
        const catId = document.getElementById('historyCat').value;
        const tbody = document.getElementById('historyBody');
        if (!fecha) return tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Selecciona una fecha</td></tr>';

        try {
            const data = await API.getAttendanceByDate(fecha, catId);
            if (data?.success) {
                if (!data.data.length) {
                    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="bi bi-calendar-x"></i><h5>Sin registros</h5><p>No hay asistencia para esta fecha</p></div></td></tr>';
                    return;
                }

                tbody.innerHTML = data.data.map(a => {
                    const colors = { presente: 'green', ausente: 'red', tardanza: 'amber', justificado: 'cyan' };
                    return `
                        <tr class="fade-in">
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    ${a.jugador?.foto ? `<img src="${a.jugador.foto}" class="player-avatar">` : `<div class="player-avatar-placeholder">${a.jugador?.nombre[0] || 'J'}</div>`}
                                    <span class="fw-bold">${Utils.escapeHtml(a.jugador?.nombre || 'N/A')}</span>
                                </div>
                            </td>
                            <td><span class="badge-custom green">${a.jugador?.categoria?.nombre || 'N/A'}</span></td>
                            <td><span class="badge-custom ${colors[a.estado]}">${a.estado}</span></td>
                            <td class="text-muted small">${Utils.escapeHtml(a.observacion || '-')}</td>
                        </tr>
                    `;
                }).join('');
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger p-4">Error al cargar historial</td></tr>';
        }
    }
};

document.addEventListener('DOMContentLoaded', AsistenciaPage.init);
