/* ===================================================
   pagos.js — Lógica de la vista Control de Pagos
   =================================================== */

let pagosData       = [];
let selectedPagoIds = new Set();
let currentMes      = new Date().getMonth() + 1;
let currentAnio     = new Date().getFullYear();
let currentPageP    = 1;
let totalPagesP     = 1;
let searchTimeout;

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
              <h4>Control de Pagos</h4>
              <div class="breadcrumb">Gestión de mensualidades</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
              <button class="btn-secondary-custom" id="btn-generar-mes" title="Generar registros de pago para el mes actual">
                <i class="bi bi-calendar-plus"></i> Generar Mes
              </button>
            </div>
          </div>
          <div class="content-area">
            <!-- Stats -->
            <div class="pagos-stats" id="pagosStats">
              ${[
                { id:'stat-total',   icon:'bi-people-fill',        colorClass:'blue',   label:'Total Jugadores',  cardClass:'total-card'    },
                { id:'stat-pagado',  icon:'bi-check-circle-fill',  colorClass:'green',  label:'Pagados',          cardClass:'pagado-card'   },
                { id:'stat-pend',    icon:'bi-clock-fill',         colorClass:'amber',  label:'Pendientes',       cardClass:'pendiente-card'},
                { id:'stat-monto',   icon:'bi-currency-dollar',    colorClass:'purple', label:'Total Recaudado',  cardClass:'monto-card'    }
              ].map(s => `
                <div class="pago-stat-card ${s.cardClass}">
                  <div class="pago-stat-icon ${s.colorClass}"><i class="bi ${s.icon}"></i></div>
                  <div class="pago-stat-value" id="${s.id}">--</div>
                  <div class="pago-stat-label">${s.label}</div>
                </div>`).join('')}
            </div>

            <!-- Filters -->
            <div class="data-card mb-4 fade-in">
              <div class="data-card-body">
                <div class="mb-3">
                  <label class="form-label-custom">Mes</label>
                  <div class="month-pills" id="monthPills">
                    ${['Ene','Feb','Mar','Apr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) =>
                      `<button class="month-pill ${i + 1 === currentMes ? 'active' : ''}" data-mes="${i + 1}">${m}</button>`
                    ).join('')}
                  </div>
                </div>
                <div class="row g-3 align-items-end">
                  <div class="col-md-3">
                    <label class="form-label-custom">Año</label>
                    <select id="anioSelect" class="form-select-custom">
                      <option value="${currentAnio - 1}">${currentAnio - 1}</option>
                      <option value="${currentAnio}" selected>${currentAnio}</option>
                      <option value="${currentAnio + 1}">${currentAnio + 1}</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label-custom">Buscar jugador</label>
                    <div class="search-bar">
                      <i class="bi bi-search"></i>
                      <input type="text" id="searchInput" class="form-control-custom" placeholder="Buscar...">
                    </div>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label-custom">Estado</label>
                    <select id="estadoFilter" class="form-select-custom">
                      <option value="">Todos</option>
                      <option value="pagado">Pagado</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label-custom">Categoría</label>
                    <select id="catFilter" class="form-select-custom">
                      <option value="">Todas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Acciones masivas — solo confirmar pagados -->
            <div class="acciones-masivas" id="accionesMasivas" style="display:none">
              <span class="count" id="selectedCount">0 seleccionados</span>
              <button class="btn-primary-custom" style="font-size:13px" id="btn-marcar-masivo-pagado">
                <i class="bi bi-check-all"></i> Confirmar Pagados
              </button>
            </div>

            <!-- Table -->
            <div class="data-card fade-in">
              <div class="data-card-header">
                <div style="display:flex;align-items:center;gap:12px">
                  <input type="checkbox" class="pago-checkbox" id="selectAll" title="Seleccionar todo">
                  <h5 style="margin:0"><i class="bi bi-credit-card-fill me-2" style="color:var(--primary)"></i> Lista de Pagos</h5>
                  <span class="badge-custom gray" id="totalBadge">0</span>
                </div>
              </div>
              <div style="overflow-x:auto">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th style="width:40px"></th><th>Jugador</th>
                      <th>Mes / Año</th><th>Monto</th>
                      <th>Estado</th><th>Fecha Pago</th>
                      <th>Método</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="pagosBody">
                    <tr><td colspan="8" class="text-center" style="padding:40px;color:var(--text-muted)">Cargando...</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination-custom" id="paginacion"></div>
            </div>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-pagos')?.classList.add('active');

    // Eventos — sin inline
    document.getElementById('monthPills').addEventListener('click', e => {
        const pill = e.target.closest('button[data-mes]');
        if (!pill) return;
        currentMes = parseInt(pill.dataset.mes);
        document.querySelectorAll('.month-pill').forEach(p => p.classList.toggle('active', p === pill));
        currentPageP = 1;
        loadAll();
    });

    document.getElementById('anioSelect').addEventListener('change', e => {
        currentAnio = parseInt(e.target.value);
        currentPageP = 1;
        loadAll();
    });

    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { currentPageP = 1; loadAll(); }, 350);
    });

    document.getElementById('estadoFilter').addEventListener('change', () => { currentPageP = 1; loadAll(); });
    document.getElementById('catFilter').addEventListener('change', () => { currentPageP = 1; loadAll(); });

    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
    document.getElementById('btn-generar-mes').addEventListener('click', generarMensualidades);
    document.getElementById('btn-marcar-masivo-pagado').addEventListener('click', () => marcarSeleccionados('pagado'));

    await loadCategorias();
    await loadAll();
}

async function loadCategorias() {
    try {
        const data = await fetchAPI('/categorias');
        if (data && data.success) {
            const select = document.getElementById('catFilter');
            data.data.forEach(cat => {
                const opt       = document.createElement('option');
                opt.value       = cat.id;
                opt.textContent = cat.nombre;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadAll() {
    const search = document.getElementById('searchInput')?.value || '';
    const estado = document.getElementById('estadoFilter')?.value || '';
    const catId  = document.getElementById('catFilter')?.value || '';

    // El servidor NO tiene paginación ni campo stats — solo devuelve data: []
    let url = `/pagos/api?mes=${currentMes}&anio=${currentAnio}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (estado) url += `&estado=${estado}`;
    if (catId)  url += `&categoria_id=${catId}`;

    try {
        const resp = await fetchAPI(url);
        if (resp && resp.success) {
            const pagos = Array.isArray(resp.data) ? resp.data : [];
            pagosData   = pagos;

            // Calcular stats desde los datos recibidos
            const statsCalculados = {
                total:            pagos.length,
                pagados:          pagos.filter(p => p.estado === 'pagado').length,
                pendientes:       pagos.filter(p => p.estado === 'pendiente').length,
                monto_recaudado:  pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (Number(p.monto) || 0), 0)
            };

            renderPagos(pagos);
            renderStats(statsCalculados);
            // Sin paginación del servidor — todo en una página
            document.getElementById('paginacion').innerHTML = '';
        }
    } catch (e) { console.error('Error cargando pagos:', e); }
}

function renderStats(stats) {
    if (!stats) return;
    document.getElementById('stat-total').textContent  = stats.total   || 0;
    document.getElementById('stat-pagado').textContent  = stats.pagados  || 0;
    document.getElementById('stat-pend').textContent   = stats.pendientes || 0;
    document.getElementById('stat-monto').textContent  = formatMoney(stats.monto_recaudado || 0);
    document.getElementById('totalBadge').textContent  = stats.total || 0;
}

function renderPagos(pagos) {
    const tbody = document.getElementById('pagosBody');
    if (!pagos || pagos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
          <i class="bi bi-credit-card"></i>
          <h5>No hay pagos para este mes</h5>
          <p>Genera los pagos del mes con el botón "Generar Mes" o ajusta los filtros.</p>
        </div></td></tr>`;
        return;
    }

    const nombresMes = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    tbody.innerHTML = pagos.map(pago => {
        const isPagado = pago.estado === 'pagado';
        return `
          <tr class="fade-in">
            <td><input type="checkbox" class="pago-checkbox pago-check" data-id="${pago.id}" ${selectedPagoIds.has(pago.id) ? 'checked' : ''}></td>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                ${pago.jugador?.foto
                  ? `<img src="${pago.jugador.foto}" class="player-avatar" alt="${escapeHtml(pago.jugador?.nombre || '')}">`
                  : `<div class="player-avatar-placeholder">${(pago.jugador?.nombre || 'J').charAt(0).toUpperCase()}</div>`}
                <div>
                  <div style="font-weight:600">${escapeHtml(pago.jugador?.nombre || 'N/A')}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${pago.jugador?.categoria ? escapeHtml(pago.jugador.categoria.nombre) : ''}</div>
                </div>
              </div>
            </td>
            <td>${nombresMes[pago.mes] || pago.mes} ${pago.anio}</td>
            <td style="font-weight:700;color:var(--primary-light)">${formatMoney(pago.monto || 0)}</td>
            <td>
              ${isPagado
                ? `<!-- Badge estático: pago confirmado, no se puede revertir -->
                   <span class="estado-badge pagado" style="cursor:default;opacity:0.85" title="Pago confirmado — no reversible">
                     <i class="bi bi-check-circle-fill"></i> Pagado
                   </span>`
                : `<button class="estado-badge pendiente" data-id="${pago.id}" data-estado="pendiente" title="Marcar como pagado">
                     <i class="bi bi-clock-fill"></i> Pendiente
                   </button>`}
            </td>
            <td style="font-size:13px;color:var(--text-muted)">${pago.fecha_pago ? formatDateShort(pago.fecha_pago) : '—'}</td>
            <td>
              ${pago.metodo_pago
                ? `<span class="badge-custom gray" style="font-size:11px">${escapeHtml(pago.metodo_pago)}</span>`
                : `<span style="color:var(--text-muted);font-size:12px">—</span>`}
            </td>
            <td>
              <button class="btn-icon edit" data-id="${pago.id}" title="Editar pago">
                <i class="bi bi-pencil"></i>
              </button>
            </td>
          </tr>`;
    }).join('');

    // Delegación de eventos — solo aplica a pendientes
    tbody.querySelectorAll('.pago-check').forEach(cb => {
        cb.addEventListener('change', () => togglePagoSelect(parseInt(cb.dataset.id), cb.checked));
    });
    // Solo el badge de pendiente es clickeable
    tbody.querySelectorAll('.estado-badge.pendiente[data-id]').forEach(btn => {
        btn.addEventListener('click', () => marcarComoPagado(btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-icon.edit[data-id]').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
}

function toggleSelectAll(e) {
    const checks = document.querySelectorAll('.pago-check');
    checks.forEach(cb => {
        cb.checked = e.target.checked;
        const id   = parseInt(cb.dataset.id);
        if (e.target.checked) selectedPagoIds.add(id);
        else                  selectedPagoIds.delete(id);
    });
    updateMasivasBar();
}

function togglePagoSelect(id, checked) {
    if (checked) selectedPagoIds.add(id);
    else          selectedPagoIds.delete(id);
    updateMasivasBar();
}

function updateMasivasBar() {
    const bar = document.getElementById('accionesMasivas');
    const cnt = document.getElementById('selectedCount');
    if (selectedPagoIds.size > 0) {
        bar.style.display  = 'flex';
        cnt.textContent    = `${selectedPagoIds.size} seleccionados`;
    } else {
        bar.style.display  = 'none';
    }
}

// Solo se puede marcar como pagado — no hay vuelta atrás
async function marcarComoPagado(id) {
    const body = {
        estado:     'pagado',
        fecha_pago: new Date().toISOString().split('T')[0]
    };
    try {
        const data = await fetchAPI(`/pagos/api/${id}`, { method: 'PUT', body });
        if (data && data.success) {
            showToast('Pago confirmado ✓');
            await loadAll();
        }
    } catch (e) { showToast(e.message || 'Error al confirmar pago', 'error'); }
}

// Acción masiva — solo permite marcar como pagado (no revertir)
async function marcarSeleccionados(estado) {
    if (selectedPagoIds.size === 0) return;

    // Filtrar: solo los que están pendientes pueden confirmarse
    const pendientesIds = Array.from(selectedPagoIds).filter(id => {
        const pago = pagosData.find(p => p.id === id);
        return pago && pago.estado === 'pendiente';
    });

    if (pendientesIds.length === 0) {
        return showToast('Todos los seleccionados ya están pagados', 'warning');
    }

    const count = pendientesIds.length;
    if (!await confirmAction(
        `¿Confirmar ${count} pago${count !== 1 ? 's' : ''} como pagados? Esta acción no se puede deshacer.`,
        'Sí, confirmar', 'btn-primary-custom', 'bi-check-circle-fill', 'var(--primary)'
    )) return;

    try {
        await Promise.all(pendientesIds.map(id => {
            return fetchAPI(`/pagos/api/${id}`, {
                method: 'PUT',
                body: { estado: 'pagado', fecha_pago: new Date().toISOString().split('T')[0] }
            });
        }));
        selectedPagoIds.clear();
        showToast(`${count} pago${count !== 1 ? 's' : ''} confirmado${count !== 1 ? 's' : ''} ✓`);
        await loadAll();
    } catch (e) { showToast(e.message || 'Error', 'error'); }
}

async function generarMensualidades() {
    const nombresMes = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (!await confirmAction(`¿Generar registros de pago para ${nombresMes[currentMes]} ${currentAnio}? Solo se crearán para jugadores que aún no tengan registro en este mes.`)) return;

    try {
        const data = await fetchAPI('/pagos/api/generar', {
            method: 'POST',
            body: { mes: currentMes, anio: currentAnio }
        });
        if (data && data.success) {
            showToast(data.message || 'Mensualidades generadas');
            await loadAll();
        }
    } catch (e) { showToast(e.message || 'Error al generar', 'error'); }
}

function openEditModal(id) {
    const pago = pagosData.find(p => p.id == id);
    if (!pago) return;

    const existing = document.getElementById('editModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'pago-modal-backdrop';
    modal.id        = 'editModal';

    modal.innerHTML = `
        <div class="pago-modal">
          <div class="pago-modal-header">
            <h5><i class="bi bi-pencil-fill" style="color:var(--secondary)"></i> Editar Pago</h5>
            <button class="btn-icon" id="btn-close-modal"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="pago-modal-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label-custom">Jugador</label>
                <input class="form-control-custom" value="${escapeHtml(pago.jugador?.nombre || '')}" readonly style="background-color:rgba(15,23,42,0.3)">
              </div>
              <div class="col-6">
                <label class="form-label-custom">Estado</label>
                <select id="editEstado" class="form-select-custom">
                  <option value="pendiente" ${pago.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="pagado"    ${pago.estado === 'pagado'    ? 'selected' : ''}>Pagado</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label-custom">Monto ($)</label>
                <input type="number" id="editMonto" class="form-control-custom" value="${pago.monto || 0}" readonly style="background-color:rgba(15,23,42,0.3);cursor:not-allowed;" title="El monto mensual automático se define en Mi Escuela">
              </div>
              <div class="col-6">
                <label class="form-label-custom">Fecha de Pago</label>
                <input type="date" id="editFechaPago" class="form-control-custom" value="${pago.fecha_pago || ''}">
              </div>
              <div class="col-6">
                <label class="form-label-custom">Método de Pago</label>
                <select id="editMetodo" class="form-select-custom">
                  <option value="">Sin especificar</option>
                  <option value="Efectivo"     ${pago.metodo_pago === 'Efectivo'     ? 'selected' : ''}>Efectivo</option>
                  <option value="Transferencia" ${pago.metodo_pago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                  <option value="Nequi"        ${pago.metodo_pago === 'Nequi'        ? 'selected' : ''}>Nequi</option>
                  <option value="Daviplata"    ${pago.metodo_pago === 'Daviplata'    ? 'selected' : ''}>Daviplata</option>
                  <option value="Otro"         ${pago.metodo_pago === 'Otro'         ? 'selected' : ''}>Otro</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label-custom">Referencia / Comprobante</label>
                <input type="text" id="editReferencia" class="form-control-custom" placeholder="Número de referencia..." value="${escapeHtml(pago.referencia || '')}">
              </div>
              <div class="col-12">
                <label class="form-label-custom">Notas</label>
                <textarea id="editNotas" class="form-control-custom" rows="2" placeholder="Notas adicionales...">${escapeHtml(pago.notas || '')}</textarea>
              </div>
            </div>
          </div>
          <div class="pago-modal-footer">
            <button class="btn-secondary-custom" id="btn-cancel-modal">Cancelar</button>
            <button class="btn-primary-custom" id="btn-save-edit">
              <i class="bi bi-check-circle"></i> Guardar
            </button>
          </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Eventos del modal — sin onclick inline
    modal.getElementById = (id) => modal.querySelector(`#${id}`);
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.remove());
    document.getElementById('btn-cancel-modal').addEventListener('click', () => modal.remove());
    document.getElementById('btn-save-edit').addEventListener('click',   () => guardarEdicion(pago.id));

    // Cerrar al click en backdrop
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function guardarEdicion(id) {
    const body = {
        estado:      document.getElementById('editEstado').value,
        monto:       parseFloat(document.getElementById('editMonto').value) || 0,
        fecha_pago:  document.getElementById('editFechaPago').value  || null,
        metodo_pago: document.getElementById('editMetodo').value     || null,
        referencia:  document.getElementById('editReferencia').value || null,
        notas:       document.getElementById('editNotas').value      || null
    };

    try {
        const data = await fetchAPI(`/pagos/api/${id}`, { method: 'PUT', body });
        if (data && data.success) {
            showToast(data.message);
            document.getElementById('editModal').remove();
            await loadAll();
        }
    } catch (e) { showToast(e.message || 'Error al guardar', 'error'); }
}

function renderPaginacion() {
    const container = document.getElementById('paginacion');
    if (totalPagesP <= 1) { container.innerHTML = ''; return; }

    let html = `<button ${currentPageP === 1 ? 'disabled' : ''} data-page="${currentPageP - 1}"><i class="bi bi-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPagesP; i++) {
        if (i === 1 || i === totalPagesP || (i >= currentPageP - 2 && i <= currentPageP + 2)) {
            html += `<button class="${i === currentPageP ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPageP - 3 || i === currentPageP + 3) {
            html += `<button disabled>...</button>`;
        }
    }
    html += `<button ${currentPageP === totalPagesP ? 'disabled' : ''} data-page="${currentPageP + 1}"><i class="bi bi-chevron-right"></i></button>`;
    container.innerHTML = html;

    container.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { currentPageP = parseInt(btn.dataset.page); loadAll(); });
    });
}

// ======= HELPERS =======
function formatMoney(value) {
    if (value === null || value === undefined) return '$0';
    return '$' + Number(value).toLocaleString('es-CO');
}
