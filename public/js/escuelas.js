/**
 * escuelas.js — Logic for Schools / Branches view
 */

const EscuelasPage = {
    modal: null,

    init: async () => {
        const user = await App.loadUserInfo();
        EscuelasPage.renderLayout(user);
        EscuelasPage.bindEvents();
        await EscuelasPage.loadEscuelas();
    },

    renderLayout: (user) => {
        const layout = document.getElementById('appLayout');
        layout.innerHTML = `
            ${App.renderSidebar(user.nombre, user.rol)}
            <main class="main-content">
                <div class="top-bar">
                    <div><button class="menu-toggle"><i class="bi bi-list"></i></button></div>
                    <div>
                        <h4>Escuelas / Sedes</h4>
                        <div class="breadcrumb">Gestión de escuelas registradas</div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="/dashboard" class="btn-secondary-custom"><i class="bi bi-arrow-left"></i> Volver</a>
                        <button class="btn-primary-custom" id="btn-new-school">
                            <i class="bi bi-building-add"></i> Nueva Escuela
                        </button>
                    </div>
                </div>
                <div class="content-area">
                    <div class="row g-4" id="escuelasGrid">
                        <div class="col-12 text-center p-5 text-muted">
                            <div class="spinner mx-auto"></div>
                            <p class="mt-2">Cargando escuelas...</p>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },

    bindEvents: () => {
        const btnNew = document.getElementById('btn-new-school');
        if (btnNew) btnNew.addEventListener('click', () => EscuelasPage.openModal());
        
        const form = document.getElementById('escuelaForm');
        if (form) form.addEventListener('submit', EscuelasPage.handleSubmit);
        
        const modalEl = document.getElementById('escuelaModal');
        if (modalEl) EscuelasPage.modal = new bootstrap.Modal(modalEl);
        
        const depSelect = document.getElementById('departamento');
        if (depSelect) {
            depSelect.addEventListener('change', (e) => {
                if (typeof poblarCiudades === 'function') poblarCiudades(e.target.value, 'ciudad');
            });
        }
    },

    loadEscuelas: async () => {
        try {
            const data = await API.get('/escuelas');
            if (data?.success) EscuelasPage.renderEscuelas(data.data);
        } catch (e) { console.error(e); }
    },

    renderEscuelas: (escuelas) => {
        const grid = document.getElementById('escuelasGrid');
        if (!escuelas?.length) {
            grid.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-building"></i><h5>No hay escuelas</h5></div></div>`;
            return;
        }

        const colors = [
            { accent: '#10b981', icon: 'green' }, { accent: '#0ea5e9', icon: 'blue' },
            { accent: '#f59e0b', icon: 'amber' }, { accent: '#8b5cf6', icon: 'cyan' }
        ];

        grid.innerHTML = escuelas.map((esc, i) => {
            const color = colors[i % colors.length];
            const activa = esc.activa !== false;
            return `
                <div class="col-lg-4 col-md-6 fade-in">
                    <div class="stat-card" style="border-left:4px solid ${color.accent}">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="stat-card-icon ${color.icon}"><i class="bi bi-building-fill"></i></div>
                            <div class="d-flex gap-1 align-items-center">
                                <span class="badge-custom ${activa ? 'green' : 'red'} small">${activa ? 'Activa' : 'Inactiva'}</span>
                                <button class="btn-icon edit" onclick="EscuelasPage.editEscuela(${esc.id})"><i class="bi bi-pencil"></i></button>
                                <button class="btn-icon delete" onclick="EscuelasPage.deleteEscuela(${esc.id}, '${Utils.escapeHtml(esc.nombre)}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                        <h5 class="fw-bold mb-1">${Utils.escapeHtml(esc.nombre)}</h5>
                        <p class="small text-secondary mb-1"><i class="bi bi-person-fill me-1"></i>${Utils.escapeHtml(esc.director || 'N/A')}</p>
                        <p class="small text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${Utils.escapeHtml(esc.ciudad || '')}, ${Utils.escapeHtml(esc.departamento || '')}</p>
                        <p class="small text-primary fw-bold"><i class="bi bi-currency-dollar me-1"></i>$${(esc.precio_mensualidad || 0).toLocaleString()}</p>
                        <div class="pt-3 border-top mt-2">
                            <span class="small text-secondary"><i class="bi bi-people-fill me-1"></i> ${esc.total_jugadores || 0} jugadores</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    openModal: (data = null) => {
        document.getElementById('escuelaId').value = data ? data.id : '';
        document.getElementById('nombre').value = data ? data.nombre : '';
        document.getElementById('direccion').value = data?.direccion || '';
        document.getElementById('telefono').value = data?.telefono || '';
        document.getElementById('director').value = data?.director || '';
        document.getElementById('email').value = data?.email || '';
        document.getElementById('precio_mensualidad').value = data?.precio_mensualidad || 0;
        document.getElementById('modalTitle').textContent = data ? 'Editar Escuela' : 'Nueva Escuela';

        if (typeof poblarDepartamentos === 'function') {
            poblarDepartamentos('departamento');
            if (data?.departamento) {
                document.getElementById('departamento').value = data.departamento;
                if (typeof poblarCiudades === 'function') poblarCiudades(data.departamento, 'ciudad');
                if (data.ciudad) document.getElementById('ciudad').value = data.ciudad;
            } else {
                document.getElementById('departamento').value = '';
                if (typeof poblarCiudades === 'function') poblarCiudades('', 'ciudad');
            }
        }

        const activaGroup = document.getElementById('activaGroup');
        if (data && activaGroup) {
            activaGroup.style.display = 'block';
            document.getElementById('activa').value = data.activa !== false ? 'true' : 'false';
        } else if (activaGroup) {
            activaGroup.style.display = 'none';
        }

        EscuelasPage.modal.show();
    },

    editEscuela: async (id) => {
        try {
            const data = await API.get(`/escuelas/${id}`);
            if (data?.success) EscuelasPage.openModal(data.data);
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        const id = document.getElementById('escuelaId').value;
        const body = {
            nombre: document.getElementById('nombre').value,
            departamento: document.getElementById('departamento').value,
            ciudad: document.getElementById('ciudad').value,
            direccion: document.getElementById('direccion').value,
            telefono: document.getElementById('telefono').value,
            director: document.getElementById('director').value,
            email: document.getElementById('email').value,
            precio_mensualidad: parseFloat(document.getElementById('precio_mensualidad').value) || 0
        };

        if (id) body.activa = document.getElementById('activa').value === 'true';

        try {
            const data = id ? await API.put(`/escuelas/${id}`, body) : await API.post('/escuelas', body);
            if (data?.success) {
                Utils.showToast(data.message);
                EscuelasPage.modal.hide();
                await EscuelasPage.loadEscuelas();
            }
        } catch (e) { Utils.showToast(e.message || 'Error al guardar', 'error'); }
    },

    deleteEscuela: async (id, nombre) => {
        if (!await Utils.confirm(`¿Eliminar la escuela "${nombre}"?`)) return;
        try {
            const data = await API.delete(`/escuelas/${id}`);
            if (data?.success) {
                Utils.showToast('Escuela eliminada');
                await EscuelasPage.loadEscuelas();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    }
};

document.addEventListener('DOMContentLoaded', EscuelasPage.init);
