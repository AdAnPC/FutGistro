/**
 * jugadores-lista.js — Logic for Player List view
 */

const JugadoresListaPage = {
    currentPage: 1,
    totalPages: 1,
    searchTimeout: null,

    init: async () => {
        const user = await App.loadUserInfo();
        JugadoresListaPage.renderLayout(user);
        JugadoresListaPage.bindEvents();
        await JugadoresListaPage.loadCategorias();
        await JugadoresListaPage.loadJugadores();
    },

    renderLayout: (user) => {
        const layout = document.getElementById('appLayout');
        layout.innerHTML = `
            ${App.renderSidebar(user.nombre, user.rol)}
            <main class="main-content">
                <div class="top-bar">
                    <div><button class="menu-toggle"><i class="bi bi-list"></i></button></div>
                    <div>
                        <h4>Jugadores</h4>
                        <div class="breadcrumb">Gestión de jugadores registrados</div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="/dashboard" class="btn-secondary-custom"><i class="bi bi-arrow-left"></i> Volver</a>
                        <a href="/jugadores/nuevo" class="btn-primary-custom"><i class="bi bi-person-plus-fill"></i> Nuevo Jugador</a>
                    </div>
                </div>
                <div class="content-area">
                    <div class="data-card mb-4 fade-in">
                        <div class="data-card-body">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-5">
                                    <label class="form-label-custom">Buscar jugador</label>
                                    <div class="search-bar">
                                        <i class="bi bi-search"></i>
                                        <input type="text" id="searchInput" class="form-control-custom" placeholder="Buscar por nombre...">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-custom">Filtrar por categoría</label>
                                    <select id="categoriaFilter" class="form-select-custom">
                                        <option value="">Todas las categorías</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn-secondary-custom w-100 justify-content-center" id="btn-clear-filters">
                                        <i class="bi bi-x-circle"></i> Limpiar filtros
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="data-card fade-in">
                        <div class="data-card-header d-flex justify-content-between align-items-center">
                            <h5><i class="bi bi-people-fill me-2 text-primary"></i> Lista de Jugadores</h5>
                            <span class="badge-custom gray" id="totalBadge">0 jugadores</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table-custom">
                                <thead>
                                    <tr>
                                        <th>Jugador</th><th>Documento</th><th>Edad</th>
                                        <th>Categoría</th><th>Acudiente</th>
                                        <th>Teléfono</th><th>Estado Pago</th><th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="jugadoresBody">
                                    <tr><td colspan="8" class="text-center p-4 text-muted">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="pagination-custom" id="pagination"></div>
                    </div>
                </div>
            </main>
        `;
    },

    bindEvents: () => {
        document.getElementById('searchInput').addEventListener('input', (e) => JugadoresListaPage.handleSearch(e.target.value));
        document.getElementById('categoriaFilter').addEventListener('change', () => { JugadoresListaPage.currentPage = 1; JugadoresListaPage.loadJugadores(); });
        document.getElementById('btn-clear-filters').addEventListener('click', JugadoresListaPage.clearFilters);
    },

    handleSearch: (val) => {
        clearTimeout(JugadoresListaPage.searchTimeout);
        JugadoresListaPage.searchTimeout = setTimeout(() => {
            JugadoresListaPage.currentPage = 1;
            JugadoresListaPage.loadJugadores();
        }, 300);
    },

    clearFilters: () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoriaFilter').value = '';
        JugadoresListaPage.currentPage = 1;
        JugadoresListaPage.loadJugadores();
    },

    loadCategorias: async () => {
        try {
            const data = await API.getCategories();
            if (data?.success) {
                const select = document.getElementById('categoriaFilter');
                data.data.forEach(cat => select.add(new Option(cat.nombre, cat.id)));
            }
        } catch (e) { console.error(e); }
    },

    loadJugadores: async () => {
        const search = document.getElementById('searchInput').value;
        const categoriaId = document.getElementById('categoriaFilter').value;

        try {
            const data = await API.getPlayers({ page: JugadoresListaPage.currentPage, limit: 15, search, categoria_id: categoriaId });
            if (data?.success) {
                JugadoresListaPage.renderJugadores(data.data);
                JugadoresListaPage.totalPages = data.paginas || 1;
                document.getElementById('totalBadge').textContent = `${data.total} jugadores`;
                JugadoresListaPage.renderPagination();
            }
        } catch (e) { console.error(e); }
    },

    renderJugadores: (jugadores) => {
        const tbody = document.getElementById('jugadoresBody');
        if (!jugadores?.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-people"></i><h5>No se encontraron jugadores</h5></div></td></tr>`;
            return;
        }

        tbody.innerHTML = jugadores.map(j => `
            <tr class="fade-in clickable-row" onclick="if(!event.target.closest('button') && !event.target.closest('a')) window.location.href='/jugadores/ficha/${j.id}'">
                <td>
                    <div class="d-flex align-items-center gap-2">
                        ${j.foto ? `<img src="${j.foto}" class="player-avatar">` : `<div class="player-avatar-placeholder">${j.nombre[0]}</div>`}
                        <div>
                            <div class="fw-bold">${Utils.escapeHtml(j.nombre)}</div>
                            <div class="small text-muted">${j.escuela?.nombre || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="small font-monospace">${Utils.escapeHtml(j.documento)}</td>
                <td><span class="badge-custom cyan">${Utils.calculateAge(j.fecha_nacimiento)} años</span></td>
                <td><span class="badge-custom green">${j.categoria?.nombre || 'N/A'}</span></td>
                <td class="small">${Utils.escapeHtml(j.nombre_padre)}</td>
                <td class="small">${Utils.escapeHtml(j.telefono_padre || j.telefono || 'N/A')}</td>
                <td>
                    ${j.pagos?.[0] ? (
                        j.pagos[0].estado === 'pagado' 
                        ? `<span class="badge-custom green small"><i class="bi bi-check-circle"></i> Pagado</span>`
                        : `<span class="badge-custom red small"><i class="bi bi-clock"></i> Pendiente</span>`
                    ) : `<span class="badge-custom gray small">N/A</span>`}
                </td>
                <td>
                    <div class="d-flex gap-1">
                        ${j.pagos?.[0]?.estado === 'pendiente' ? `
                            <button class="btn-icon text-success" title="Pagar" onclick="event.stopPropagation(); JugadoresListaPage.registrarPago(${j.pagos[0].id})"><i class="bi bi-currency-dollar"></i></button>
                        ` : ''}
                        <button class="btn-icon text-primary" title="Carnet" onclick="event.stopPropagation(); JugadoresListaPage.generarCarnet(${j.id})"><i class="bi bi-person-badge"></i></button>
                        <a href="/jugadores/editar/${j.id}" class="btn-icon edit" onclick="event.stopPropagation()"><i class="bi bi-pencil"></i></a>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderPagination: () => {
        const container = document.getElementById('pagination');
        if (JugadoresListaPage.totalPages <= 1) return container.innerHTML = '';

        let html = `<button ${JugadoresListaPage.currentPage === 1 ? 'disabled' : ''} onclick="JugadoresListaPage.goToPage(${JugadoresListaPage.currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
        for (let i = 1; i <= JugadoresListaPage.totalPages; i++) {
            if (i === 1 || i === JugadoresListaPage.totalPages || (i >= JugadoresListaPage.currentPage - 2 && i <= JugadoresListaPage.currentPage + 2)) {
                html += `<button class="${i === JugadoresListaPage.currentPage ? 'active' : ''}" onclick="JugadoresListaPage.goToPage(${i})">${i}</button>`;
            } else if (i === JugadoresListaPage.currentPage - 3 || i === JugadoresListaPage.currentPage + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        html += `<button ${JugadoresListaPage.currentPage === JugadoresListaPage.totalPages ? 'disabled' : ''} onclick="JugadoresListaPage.goToPage(${JugadoresListaPage.currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
        container.innerHTML = html;
    },

    goToPage: (page) => {
        JugadoresListaPage.currentPage = page;
        JugadoresListaPage.loadJugadores();
    },

    registrarPago: async (pagoId) => {
        if (!await Utils.confirm('¿Deseas registrar el pago de este mes?', 'Sí, pagar', 'btn-success-custom', 'bi-cash-coin', 'var(--success)')) return;
        try {
            const data = await API.updatePayment(pagoId, { estado: 'pagado', fecha_pago: Utils.getTodayStr() });
            if (data?.success) {
                Utils.showToast('Pago registrado');
                JugadoresListaPage.loadJugadores();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    generarCarnet: async (id) => {
        try {
            Utils.showToast('Generando carnet...', 'info');
            const res = await API.getPlayer(id);
            if (!res?.success) throw new Error('No se pudo cargar el jugador');
            const j = res.data;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 85.6] });

            // Design
            doc.setFillColor(15, 23, 42); doc.rect(0, 0, 54, 25, 'F');
            doc.setFillColor(16, 185, 129); doc.rect(0, 25, 54, 2, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text(j.escuela?.nombre.toUpperCase() || 'ESCUELA', 27, 10, { align: 'center', maxWidth: 50 });
            doc.setTextColor(16, 185, 129); doc.setFontSize(6); doc.text('CARNET DE JUGADOR', 27, 20, { align: 'center' });

            if (j.foto) {
                await new Promise(r => {
                    const img = new Image(); img.crossOrigin = 'Anonymous';
                    img.onload = () => { doc.addImage(img, 'JPEG', 17, 30, 20, 20); r(); };
                    img.onerror = () => r(); img.src = j.foto;
                });
            } else {
                doc.setFillColor(200, 200, 200); doc.rect(17, 30, 20, 20, 'F');
            }

            doc.setTextColor(15, 23, 42); doc.setFontSize(8); doc.text(j.nombre.toUpperCase(), 27, 56, { align: 'center', maxWidth: 50 });
            doc.setFontSize(6); doc.setFont('helvetica', 'normal');
            doc.text(`DOC: ${j.documento}`, 27, 61, { align: 'center' });
            doc.text(`CAT: ${j.categoria?.nombre || 'S/C'}`, 27, 65, { align: 'center' });
            doc.text(`EDAD: ${Utils.calculateAge(j.fecha_nacimiento)} AÑOS`, 27, 69, { align: 'center' });

            doc.setFillColor(241, 245, 249); doc.rect(0, 77, 54, 9, 'F');
            doc.setTextColor(100, 116, 139); doc.setFontSize(4); doc.text('Documento válido para la temporada actual.', 27, 81, { align: 'center' });
            
            doc.save(`Carnet_${j.nombre.replace(/\s+/g, '_')}.pdf`);
        } catch (e) { Utils.showToast(e.message, 'error'); }
    }
};

document.addEventListener('DOMContentLoaded', JugadoresListaPage.init);
