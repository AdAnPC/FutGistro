/* ===================================================
   asistencia.js — Lógica de la vista Asistencia
   =================================================== */

let jugadoresList = [];
let attendanceMap = {};

document.addEventListener('DOMContentLoaded', () => {
    buildPage();
});

async function buildPage() {
    const user   = await loadUserInfo();
    const layout = document.getElementById('appLayout');
    layout.innerHTML = `
        ${renderSidebar(user.nombre, user.rol)}
        <main class="main-content">
          <div class="top-bar">
            <div>
              <button class="menu-toggle" id="menuToggle"><i class="bi bi-list"></i></button>
            </div>
            <div>
              <h4>Control de Asistencia</h4>
              <div class="breadcrumb">Registro y gestión de asistencia</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
            </div>
          </div>
          <div class="content-area">
            <!-- Tab Navigation -->
            <div class="data-card mb-4 fade-in">
              <div class="data-card-body" style="padding:12px 16px">
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <button class="btn-primary-custom tab-btn active" id="tab-register">
                    <i class="bi bi-pencil-square"></i> Tomar Asistencia
                  </button>
                  <button class="btn-secondary-custom tab-btn" id="tab-history">
                    <i class="bi bi-clock-history"></i> Historial
                  </button>
                </div>
              </div>
            </div>

            <!-- Register Tab -->
            <div id="registerTab">
              <div class="data-card mb-4 fade-in">
                <div class="data-card-header">
                  <h5><i class="bi bi-calendar-check-fill me-2" style="color:var(--primary)"></i> Registrar Asistencia</h5>
                </div>
                <div class="data-card-body">
                  <div class="row g-3 mb-4">
                    <div class="col-md-4">
                      <label class="form-label-custom">Fecha del entrenamiento *</label>
                      <input type="date" id="attendanceDate" class="form-control-custom" value="${getTodayStr()}">
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

                  <!-- Quick Actions -->
                  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
                    <button class="btn-secondary-custom" style="font-size:12px" id="btn-mark-all-present">
                      <i class="bi bi-check-all"></i> Todos presentes
                    </button>
                    <button class="btn-secondary-custom" style="font-size:12px" id="btn-mark-all-absent">
                      <i class="bi bi-x-circle"></i> Todos ausentes
                    </button>
                  </div>

                  <div id="attendanceList">
                    <div class="text-center" style="padding:40px;color:var(--text-muted)">
                      <i class="bi bi-people d-block" style="font-size:40px;opacity:0.3;margin-bottom:8px"></i>
                      Selecciona una categoría o carga todos los jugadores
                    </div>
                  </div>

                  <div class="mt-4 text-end" id="saveSection" style="display:none">
                    <button class="btn-primary-custom" id="btn-save-attendance">
                      <i class="bi bi-check-circle"></i> Guardar Asistencia
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- History Tab -->
            <div id="historyTab" style="display:none">
              <div class="data-card fade-in">
                <div class="data-card-header">
                  <h5><i class="bi bi-clock-history me-2" style="color:var(--secondary)"></i> Historial de Asistencia</h5>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <input type="date" id="historyDate" class="form-control-custom" style="width:auto" value="${getTodayStr()}">
                    <select id="historyCat" class="form-select-custom" style="width:auto">
                      <option value="">Todas</option>
                    </select>
                  </div>
                </div>
                <div style="overflow-x:auto">
                  <table class="table-custom">
                    <thead>
                      <tr><th>Jugador</th><th>Categoría</th><th>Estado</th><th>Observación</th></tr>
                    </thead>
                    <tbody id="historyBody">
                      <tr><td colspan="4" class="text-center" style="padding:40px;color:var(--text-muted)">Selecciona una fecha para ver el historial</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-asistencia')?.classList.add('active');

    // Eventos — sin inline
    document.getElementById('tab-register').addEventListener('click', function() { switchTab('register', this); });
    document.getElementById('tab-history').addEventListener('click', function()  { switchTab('history',  this); });
    document.getElementById('attendanceCategoria').addEventListener('change', loadJugadoresForAttendance);
    document.getElementById('btn-load-existing').addEventListener('click', loadExistingAttendance);
    document.getElementById('btn-mark-all-present').addEventListener('click', () => markAll('presente'));
    document.getElementById('btn-mark-all-absent').addEventListener('click',  () => markAll('ausente'));
    document.getElementById('btn-save-attendance').addEventListener('click', saveAttendance);
    document.getElementById('historyDate').addEventListener('change', loadHistory);
    document.getElementById('historyCat').addEventListener('change', loadHistory);

    await loadCategorias();
    await loadJugadoresForAttendance();
}

function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.className = b === btn ? 'btn-primary-custom tab-btn active' : 'btn-secondary-custom tab-btn';
    });
    document.getElementById('registerTab').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('historyTab').style.display  = tab === 'history'  ? 'block' : 'none';
    if (tab === 'history') loadHistory();
}

async function loadCategorias() {
    try {
        const data = await fetchAPI('/categorias');
        if (data && data.success) {
            ['attendanceCategoria', 'historyCat'].forEach(selectId => {
                const select = document.getElementById(selectId);
                if (!select) return;
                data.data.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value       = cat.id;
                    opt.textContent = cat.nombre;
                    select.appendChild(opt);
                });
            });
        }
    } catch (e) { console.error(e); }
}

async function loadJugadoresForAttendance() {
    const catId = document.getElementById('attendanceCategoria')?.value || '';
    let url = '/jugadores/api?limit=200';
    if (catId) url += `&categoria_id=${catId}`;

    try {
        const data = await fetchAPI(url);
        if (data && data.success) {
            jugadoresList = data.data;
            renderAttendanceList();
        }
    } catch (e) { console.error(e); }
}

function renderAttendanceList() {
    const container   = document.getElementById('attendanceList');
    const saveSection = document.getElementById('saveSection');

    if (!jugadoresList || jugadoresList.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><h5>Sin jugadores</h5><p>No hay jugadores en esta categoría</p></div>`;
        saveSection.style.display = 'none';
        return;
    }

    saveSection.style.display = 'block';
    container.innerHTML = `
        <div style="overflow-x:auto">
          <table class="table-custom">
            <thead><tr><th>Jugador</th><th>Categoría</th><th style="text-align:center">Estado</th></tr></thead>
            <tbody>
              ${jugadoresList.map(j => {
                const currentState = attendanceMap[j.id] || 'presente';
                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        ${j.foto
                          ? `<img src="${j.foto}" class="player-avatar" alt="${escapeHtml(j.nombre)}">`
                          : `<div class="player-avatar-placeholder">${j.nombre.charAt(0).toUpperCase()}</div>`}
                        <span style="font-weight:600">${escapeHtml(j.nombre)}</span>
                      </div>
                    </td>
                    <td><span class="badge-custom green">${j.categoria ? escapeHtml(j.categoria.nombre) : 'N/A'}</span></td>
                    <td>
                      <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
                        <span class="attendance-badge presente ${currentState === 'presente'   ? 'selected' : ''}" data-id="${j.id}" data-estado="presente"><i class="bi bi-check-circle"></i> Presente</span>
                        <span class="attendance-badge ausente ${currentState === 'ausente'    ? 'selected' : ''}" data-id="${j.id}" data-estado="ausente"><i class="bi bi-x-circle"></i> Ausente</span>
                        <span class="attendance-badge tardanza ${currentState === 'tardanza'  ? 'selected' : ''}" data-id="${j.id}" data-estado="tardanza"><i class="bi bi-clock"></i> Tardanza</span>
                        <span class="attendance-badge justificado ${currentState === 'justificado' ? 'selected' : ''}" data-id="${j.id}" data-estado="justificado"><i class="bi bi-file-text"></i> Justificado</span>
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;

    // Delegación de eventos — sin onclick inline
    container.querySelectorAll('.attendance-badge').forEach(badge => {
        badge.addEventListener('click', function() {
            setAttendance(this.dataset.id, this.dataset.estado, this);
        });
    });

    jugadoresList.forEach(j => {
        if (!attendanceMap[j.id]) attendanceMap[j.id] = 'presente';
    });
}

function setAttendance(jugadorId, estado, el) {
    attendanceMap[jugadorId] = estado;
    const row = el.closest('td');
    row.querySelectorAll('.attendance-badge').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
}

function markAll(estado) {
    jugadoresList.forEach(j => { attendanceMap[j.id] = estado; });
    renderAttendanceList();
}

async function loadExistingAttendance() {
    const fecha = document.getElementById('attendanceDate').value;
    const catId = document.getElementById('attendanceCategoria')?.value || '';

    if (!fecha) { showToast('Selecciona una fecha', 'warning'); return; }

    try {
        let url = `/asistencia/api/por-fecha/${fecha}`;
        if (catId) url += `?categoria_id=${catId}`;

        const data = await fetchAPI(url);
        if (data && data.success) {
            attendanceMap = {};
            data.data.forEach(a => { attendanceMap[a.jugador_id] = a.estado; });
            renderAttendanceList();
            showToast(`${data.data.length} registros cargados`);
        }
    } catch (e) { console.error(e); }
}

async function saveAttendance() {
    const fecha = document.getElementById('attendanceDate').value;
    if (!fecha) { showToast('Selecciona una fecha', 'warning'); return; }

    const asistencias = Object.keys(attendanceMap).map(id => ({
        jugador_id: parseInt(id),
        estado:     attendanceMap[id]
    }));

    if (asistencias.length === 0) { showToast('No hay jugadores para registrar', 'warning'); return; }

    try {
        const data = await fetchAPI('/asistencia/api', {
            method: 'POST',
            body: { fecha, asistencias }
        });
        if (data && data.success) {
            showToast('Asistencia guardada exitosamente');
        }
    } catch (e) {
        showToast(e.message || 'Error al guardar', 'error');
    }
}

async function loadHistory() {
    const fecha = document.getElementById('historyDate').value;
    const catId = document.getElementById('historyCat')?.value || '';
    const tbody = document.getElementById('historyBody');

    if (!fecha) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:40px;color:var(--text-muted)">Selecciona una fecha</td></tr>';
        return;
    }

    try {
        let url = `/asistencia/api/por-fecha/${fecha}`;
        if (catId) url += `?categoria_id=${catId}`;

        const data = await fetchAPI(url);
        if (data && data.success) {
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="bi bi-calendar-x"></i><h5>Sin registros</h5><p>No hay asistencia registrada para esta fecha</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = data.data.map(a => {
                const badgeClass = a.estado === 'presente' ? 'green' : a.estado === 'ausente' ? 'red' : a.estado === 'tardanza' ? 'amber' : 'cyan';
                return `
                  <tr class="fade-in">
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        ${a.jugador?.foto
                          ? `<img src="${a.jugador.foto}" class="player-avatar" alt="${escapeHtml(a.jugador?.nombre || '')}">`
                          : `<div class="player-avatar-placeholder">${(a.jugador?.nombre || 'J').charAt(0).toUpperCase()}</div>`}
                        <span style="font-weight:600">${escapeHtml(a.jugador?.nombre || 'N/A')}</span>
                      </div>
                    </td>
                    <td><span class="badge-custom green">${a.jugador?.categoria ? escapeHtml(a.jugador.categoria.nombre) : 'N/A'}</span></td>
                    <td><span class="badge-custom ${badgeClass}">${a.estado}</span></td>
                    <td style="color:var(--text-muted);font-size:13px">${escapeHtml(a.observacion || '-')}</td>
                  </tr>`;
            }).join('');
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--danger);padding:20px">Error al cargar historial</td></tr>';
    }
}
