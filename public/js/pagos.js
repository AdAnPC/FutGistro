/**
 * pagos.js — Logic for Payment Control view
 */

const PagosPage = {
    pagosData: [],
    selectedPagoIds: new Set(),
    currentMes: new Date().getMonth() + 1,
    currentAnio: new Date().getFullYear(),

    init: async () => {
        const user = await App.loadUserInfo();
        PagosPage.renderLayout(user);
        PagosPage.bindEvents();
        await PagosPage.loadCategorias();
        await PagosPage.loadAll();
    },

    renderLayout: (user) => {
        const layout = document.getElementById('appLayout');
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        
        layout.innerHTML = `
            ${App.renderSidebar(user.nombre, user.rol)}
            <main class="main-content">
                <div class="top-bar">
                    <div><button class="menu-toggle"><i class="bi bi-list"></i></button></div>
                    <div>
                        <h4>Control de Pagos</h4>
                        <div class="breadcrumb">Gestión de mensualidades</div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="/dashboard" class="btn-secondary-custom"><i class="bi bi-arrow-left"></i> Volver</a>
                        <button class="btn-secondary-custom" id="btn-generar-mes" title="Generar registros de pago para el mes actual">
                            <i class="bi bi-calendar-plus"></i> Generar Mes
                        </button>
                    </div>
                </div>
                <div class="content-area">
                    <!-- Stats -->
                    <div class="pagos-stats mb-4">
                        <div class="pago-stat-card total-card">
                            <div class="pago-stat-icon blue"><i class="bi bi-people-fill"></i></div>
                            <div class="pago-stat-value" id="stat-total">--</div>
                            <div class="pago-stat-label">Total Jugadores</div>
                        </div>
                        <div class="pago-stat-card pagado-card">
                            <div class="pago-stat-icon green"><i class="bi bi-check-circle-fill"></i></div>
                            <div class="pago-stat-value" id="stat-pagado">--</div>
                            <div class="pago-stat-label">Pagados</div>
                        </div>
                        <div class="pago-stat-card pendiente-card">
                            <div class="pago-stat-icon amber"><i class="bi bi-clock-fill"></i></div>
                            <div class="pago-stat-value" id="stat-pend">--</div>
                            <div class="pago-stat-label">Pendientes</div>
                        </div>
                        <div class="pago-stat-card monto-card">
                            <div class="pago-stat-icon purple"><i class="bi bi-currency-dollar"></i></div>
                            <div class="pago-stat-value" id="stat-monto">--</div>
                            <div class="pago-stat-label">Total Recaudado</div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="data-card mb-4 fade-in">
                        <div class="data-card-body">
                            <div class="mb-3">
                                <label class="form-label-custom">Mes</label>
                                <div class="month-pills" id="monthPills">
                                    ${months.map((m, i) => `<button class="month-pill ${i + 1 === PagosPage.currentMes ? 'active' : ''}" data-mes="${i + 1}">${m}</button>`).join('')}
                                </div>
                            </div>
                            <div class="row g-3 align-items-end">
                                <div class="col-md-2">
                                    <label class="form-label-custom">Año</label>
                                    <select id="anioSelect" class="form-select-custom">
                                        ${[PagosPage.currentAnio-1, PagosPage.currentAnio, PagosPage.currentAnio+1].map(a => `<option value="${a}" ${a === PagosPage.currentAnio ? 'selected' : ''}>${a}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-custom">Buscar jugador</label>
                                    <div class="search-bar">
                                        <i class="bi bi-search"></i>
                                        <input type="text" id="searchInput" class="form-control-custom" placeholder="Buscar por nombre...">
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
                                <div class="col-md-3">
                                    <label class="form-label-custom">Categoría</label>
                                    <select id="catFilter" class="form-select-custom">
                                        <option value="">Todas</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Actions -->
                    <div class="acciones-masivas mb-3" id="accionesMasivas" style="display:none">
                        <span class="count" id="selectedCount">0 seleccionados</span>
                        <button class="btn-primary-custom" id="btn-marcar-masivo-pagado">
                            <i class="bi bi-check-all"></i> Confirmar Pagados
                        </button>
                    </div>

                    <!-- Table -->
                    <div class="data-card fade-in">
                        <div class="data-card-header d-flex align-items-center gap-3">
                            <input type="checkbox" class="pago-checkbox" id="selectAll">
                            <h5 class="mb-0"><i class="bi bi-credit-card-fill me-2 text-primary"></i> Lista de Pagos</h5>
                            <span class="badge-custom gray" id="totalBadge">0</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table-custom">
                                <thead>
                                    <tr>
                                        <th style="width:40px"></th><th>Jugador</th><th>Periodo</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Método</th><th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="pagosBody">
                                    <tr><td colspan="8" class="text-center p-4 text-muted">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },

    bindEvents: () => {
        document.getElementById('monthPills').addEventListener('click', (e) => {
            const pill = e.target.closest('button[data-mes]');
            if (!pill) return;
            PagosPage.currentMes = parseInt(pill.dataset.mes);
            document.querySelectorAll('.month-pill').forEach(p => p.classList.toggle('active', p === pill));
            PagosPage.loadAll();
        });

        document.getElementById('anioSelect').addEventListener('change', (e) => {
            PagosPage.currentAnio = parseInt(e.target.value);
            PagosPage.loadAll();
        });

        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => PagosPage.loadAll(), 350);
        });

        document.getElementById('estadoFilter').addEventListener('change', () => PagosPage.loadAll());
        document.getElementById('catFilter').addEventListener('change', () => PagosPage.loadAll());
        document.getElementById('selectAll').addEventListener('change', PagosPage.toggleSelectAll);
        document.getElementById('btn-generar-mes').addEventListener('click', PagosPage.generarMensualidades);
        document.getElementById('btn-marcar-masivo-pagado').addEventListener('click', PagosPage.marcarSeleccionados);
    },

    loadCategorias: async () => {
        try {
            const data = await API.getCategories();
            if (data?.success) {
                const select = document.getElementById('catFilter');
                data.data.forEach(cat => select.add(new Option(cat.nombre, cat.id)));
            }
        } catch (e) { console.error(e); }
    },

    loadAll: async () => {
        const search = document.getElementById('searchInput').value;
        const estado = document.getElementById('estadoFilter').value;
        const categoriaId = document.getElementById('catFilter').value;

        try {
            const data = await API.getPayments({ mes: PagosPage.currentMes, anio: PagosPage.currentAnio, search, estado, categoria_id: categoriaId });
            if (data?.success) {
                PagosPage.pagosData = data.data;
                PagosPage.renderPagos();
                PagosPage.updateStats();
            }
        } catch (e) { console.error(e); }
    },

    updateStats: () => {
        const stats = {
            total: PagosPage.pagosData.length,
            pagados: PagosPage.pagosData.filter(p => p.estado === 'pagado').length,
            pendientes: PagosPage.pagosData.filter(p => p.estado === 'pendiente').length,
            recaudado: PagosPage.pagosData.filter(p => p.estado === 'pagado').reduce((s, p) => s + (Number(p.monto) || 0), 0)
        };

        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-pagado').textContent = stats.pagados;
        document.getElementById('stat-pend').textContent = stats.pendientes;
        document.getElementById('stat-monto').textContent = `$${stats.recaudado.toLocaleString('es-CO')}`;
        document.getElementById('totalBadge').textContent = stats.total;
    },

    renderPagos: () => {
        const tbody = document.getElementById('pagosBody');
        if (!PagosPage.pagosData.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h5>Sin registros</h5></div></td></tr>`;
            return;
        }

        const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        tbody.innerHTML = PagosPage.pagosData.map(p => `
            <tr class="fade-in">
                <td><input type="checkbox" class="pago-check" data-id="${p.id}" ${PagosPage.selectedPagoIds.has(p.id) ? 'checked' : ''} onchange="PagosPage.toggleSelect(${p.id}, this.checked)"></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        ${p.jugador?.foto ? `<img src="${p.jugador.foto}" class="player-avatar">` : `<div class="player-avatar-placeholder">${p.jugador?.nombre[0] || 'J'}</div>`}
                        <div>
                            <div class="fw-bold">${Utils.escapeHtml(p.jugador?.nombre || 'N/A')}</div>
                            <div class="small text-muted">${p.jugador?.categoria?.nombre || ''}</div>
                        </div>
                    </div>
                </td>
                <td>${meses[p.mes]} ${p.anio}</td>
                <td class="fw-bold text-primary">$${(Number(p.monto) || 0).toLocaleString('es-CO')}</td>
                <td>
                    ${p.estado === 'pagado' 
                        ? `<span class="badge-custom green"><i class="bi bi-check-circle-fill"></i> Pagado</span>`
                        : `<button class="estado-badge pendiente" onclick="PagosPage.marcarComoPagado(${p.id})"><i class="bi bi-clock-fill"></i> Pendiente</button>`}
                </td>
                <td class="small text-muted">${p.fecha_pago ? Utils.formatDateShort(p.fecha_pago) : '—'}</td>
                <td><span class="badge-custom gray small">${p.metodo_pago || '—'}</span></td>
                <td>
                    <button class="btn-icon edit" onclick="PagosPage.openEditModal(${p.id})"><i class="bi bi-pencil"></i></button>
                </td>
            </tr>
        `).join('');
    },

    toggleSelectAll: (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.pago-check').forEach(cb => {
            cb.checked = checked;
            const id = parseInt(cb.dataset.id);
            if (checked) PagosPage.selectedPagoIds.add(id);
            else PagosPage.selectedPagoIds.delete(id);
        });
        PagosPage.updateBulkBar();
    },

    toggleSelect: (id, checked) => {
        if (checked) PagosPage.selectedPagoIds.add(id);
        else PagosPage.selectedPagoIds.delete(id);
        PagosPage.updateBulkBar();
    },

    updateBulkBar: () => {
        const bar = document.getElementById('accionesMasivas');
        const count = document.getElementById('selectedCount');
        if (PagosPage.selectedPagoIds.size > 0) {
            bar.style.display = 'flex';
            count.textContent = `${PagosPage.selectedPagoIds.size} seleccionados`;
        } else {
            bar.style.display = 'none';
        }
    },

    marcarComoPagado: async (id) => {
        try {
            const data = await API.updatePayment(id, { estado: 'pagado', fecha_pago: Utils.getTodayStr() });
            if (data?.success) {
                Utils.showToast('Pago registrado');
                await PagosPage.loadAll();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    marcarSeleccionados: async () => {
        const ids = Array.from(PagosPage.selectedPagoIds);
        if (!ids.length) return;
        
        if (!await Utils.confirm(`¿Confirmar ${ids.length} pagos?`, 'Sí, confirmar', 'btn-primary-custom', 'bi-check-circle-fill', 'var(--primary)')) return;

        try {
            Utils.showLoading();
            await Promise.all(ids.map(id => API.updatePayment(id, { estado: 'pagado', fecha_pago: Utils.getTodayStr() })));
            PagosPage.selectedPagoIds.clear();
            Utils.showToast('Pagos registrados correctamente');
            await PagosPage.loadAll();
        } catch (e) { Utils.showToast(e.message, 'error'); }
        finally { Utils.hideLoading(); }
    },

    generarMensualidades: async () => {
        if (!await Utils.confirm('¿Generar registros de pago para este mes?')) return;
        try {
            const data = await API.post('/pagos/api/generar', { mes: PagosPage.currentMes, anio: PagosPage.currentAnio });
            if (data?.success) {
                Utils.showToast(data.message);
                await PagosPage.loadAll();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    openEditModal: (id) => {
        const p = PagosPage.pagosData.find(x => x.id === id);
        if (!p) return;

        const modal = document.createElement('div');
        modal.className = 'pago-modal-backdrop';
        modal.id = 'editModal';
        modal.innerHTML = `
            <div class="pago-modal">
                <div class="pago-modal-header">
                    <h5><i class="bi bi-pencil-fill text-secondary"></i> Editar Pago</h5>
                    <button class="btn-icon" onclick="this.closest('#editModal').remove()"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="pago-modal-body">
                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label-custom">Jugador</label>
                            <input class="form-control-custom" value="${Utils.escapeHtml(p.jugador?.nombre || '')}" readonly disabled>
                        </div>
                        <div class="col-6">
                            <label class="form-label-custom">Estado</label>
                            <select id="editEstado" class="form-select-custom">
                                <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="pagado" ${p.estado === 'pagado' ? 'selected' : ''}>Pagado</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label-custom">Monto ($)</label>
                            <input type="number" id="editMonto" class="form-control-custom" value="${p.monto || 0}" readonly disabled>
                        </div>
                        <div class="col-6">
                            <label class="form-label-custom">Fecha Pago</label>
                            <input type="date" id="editFecha" class="form-control-custom" value="${p.fecha_pago || ''}">
                        </div>
                        <div class="col-6">
                            <label class="form-label-custom">Método</label>
                            <select id="editMetodo" class="form-select-custom">
                                <option value="">Sin especificar</option>
                                <option value="Efectivo" ${p.metodo_pago === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                                <option value="Transferencia" ${p.metodo_pago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                                <option value="Nequi" ${p.metodo_pago === 'Nequi' ? 'selected' : ''}>Nequi</option>
                                <option value="Daviplata" ${p.metodo_pago === 'Daviplata' ? 'selected' : ''}>Daviplata</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label-custom">Referencia</label>
                            <input type="text" id="editReferencia" class="form-control-custom" value="${Utils.escapeHtml(p.referencia || '')}">
                        </div>
                    </div>
                </div>
                <div class="pago-modal-footer">
                    <button class="btn-secondary-custom" onclick="this.closest('#editModal').remove()">Cancelar</button>
                    <button class="btn-primary-custom" onclick="PagosPage.saveEdit(${id})"><i class="bi bi-check-circle"></i> Guardar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    saveEdit: async (id) => {
        const body = {
            estado: document.getElementById('editEstado').value,
            fecha_pago: document.getElementById('editFecha').value || null,
            metodo_pago: document.getElementById('editMetodo').value || null,
            referencia: document.getElementById('editReferencia').value || null
        };

        try {
            const data = await API.updatePayment(id, body);
            if (data?.success) {
                Utils.showToast('Pago actualizado');
                document.getElementById('editModal').remove();
                await PagosPage.loadAll();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    }
};

document.addEventListener('DOMContentLoaded', PagosPage.init);
