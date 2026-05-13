/**
 * categorias.js — Logic for Categories view
 */

const CategoriasPage = {
    modal: null,

    init: async () => {
        const user = await App.loadUserInfo();
        CategoriasPage.renderLayout(user);
        CategoriasPage.bindEvents();
        await CategoriasPage.loadCategorias();
    },

    renderLayout: (user) => {
        const layout = document.getElementById('appLayout');
        layout.innerHTML = `
            ${App.renderSidebar(user.nombre, user.rol)}
            <main class="main-content">
                <div class="top-bar">
                    <div><button class="menu-toggle"><i class="bi bi-list"></i></button></div>
                    <div>
                        <h4>Categorías</h4>
                        <div class="breadcrumb">Gestión de categorías</div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="/dashboard" class="btn-secondary-custom"><i class="bi bi-arrow-left"></i> Volver</a>
                        <button class="btn-primary-custom" id="btn-new-category">
                            <i class="bi bi-plus-circle"></i> Nueva Categoría
                        </button>
                    </div>
                </div>
                <div class="content-area">
                    <div class="row g-4" id="categoriasGrid">
                        <div class="col-12 text-center p-5 text-muted">
                            <div class="spinner mx-auto"></div>
                            <p class="mt-2">Cargando categorías...</p>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },

    bindEvents: () => {
        document.getElementById('btn-new-category').addEventListener('click', () => CategoriasPage.openModal());
        document.getElementById('categoriaForm').addEventListener('submit', CategoriasPage.handleSubmit);
        document.getElementById('anio_nacimiento').addEventListener('input', CategoriasPage.calcularEdadesPorAnio);
        CategoriasPage.modal = new bootstrap.Modal(document.getElementById('categoriaModal'));
    },

    loadCategorias: async () => {
        try {
            const data = await API.getCategories();
            if (data?.success) CategoriasPage.renderCategorias(data.data);
        } catch (e) { console.error(e); }
    },

    renderCategorias: (categorias) => {
        const grid = document.getElementById('categoriasGrid');
        if (!categorias?.length) {
            grid.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-tags"></i><h5>No hay categorías</h5><button class="btn-primary-custom mt-3" onclick="CategoriasPage.openModal()"><i class="bi bi-plus-circle"></i> Nueva Categoría</button></div></div>`;
            return;
        }

        const colors = [
            { accent: '#10b981', icon: 'green' }, { accent: '#0ea5e9', icon: 'blue' },
            { accent: '#f59e0b', icon: 'amber' }, { accent: '#ef4444', icon: 'red' },
            { accent: '#8b5cf6', icon: 'cyan' }, { accent: '#06b6d4', icon: 'cyan' }
        ];

        grid.innerHTML = categorias.map((cat, i) => {
            const color = colors[i % colors.length];
            return `
                <div class="col-lg-4 col-md-6 fade-in">
                    <div class="stat-card" style="border-left:4px solid ${color.accent}">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="stat-card-icon ${color.icon}"><i class="bi bi-trophy-fill"></i></div>
                            <div class="d-flex gap-1">
                                <button class="btn-icon edit" onclick="CategoriasPage.editCategoria(${cat.id})"><i class="bi bi-pencil"></i></button>
                                <button class="btn-icon delete" onclick="CategoriasPage.deleteCategoria(${cat.id}, '${Utils.escapeHtml(cat.nombre)}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                        <h5 class="fw-bold mb-1">${Utils.escapeHtml(cat.nombre)}</h5>
                        <p class="small text-muted mb-3">Edades: ${cat.edad_min} - ${cat.edad_max} años</p>
                        <div class="d-flex align-items-center justify-content-between pt-3 border-top">
                            <span class="small text-secondary"><i class="bi bi-people-fill me-1"></i> ${cat.total_jugadores || 0} jugadores</span>
                            <a href="/jugadores/page" class="btn-secondary-custom btn-sm">Ver jugadores <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    openModal: (data = null) => {
        document.getElementById('categoriaId').value = data ? data.id : '';
        document.getElementById('nombre').value = data ? data.nombre : '';
        document.getElementById('edad_min').value = data ? data.edad_min : '';
        document.getElementById('edad_max').value = data ? data.edad_max : '';
        document.getElementById('anio_nacimiento').value = '';
        document.getElementById('modalTitle').textContent = data ? 'Editar Categoría' : 'Nueva Categoría';
        CategoriasPage.modal.show();
    },

    calcularEdadesPorAnio: (e) => {
        const val = e.target.value;
        if (val.length === 4) {
            const anio = parseInt(val);
            const currentYear = new Date().getFullYear();
            if (anio > 1900 && anio <= currentYear) {
                const edad = currentYear - anio;
                document.getElementById('edad_min').value = edad;
                document.getElementById('edad_max').value = edad;
            }
        }
    },

    editCategoria: async (id) => {
        try {
            const data = await API.getCategory(id);
            if (data?.success) CategoriasPage.openModal(data.data);
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        const id = document.getElementById('categoriaId').value;
        const body = {
            nombre: document.getElementById('nombre').value,
            edad_min: parseInt(document.getElementById('edad_min').value),
            edad_max: parseInt(document.getElementById('edad_max').value)
        };

        try {
            const data = id ? await API.put(`/categorias/${id}`, body) : await API.post('/categorias', body);
            if (data?.success) {
                Utils.showToast(data.message);
                CategoriasPage.modal.hide();
                await CategoriasPage.loadCategorias();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    deleteCategoria: async (id, nombre) => {
        if (!await Utils.confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
        try {
            const data = await API.delete(`/categorias/${id}`);
            if (data?.success) {
                Utils.showToast('Categoría eliminada');
                await CategoriasPage.loadCategorias();
            }
        } catch (e) { Utils.showToast(e.message, 'error'); }
    }
};

document.addEventListener('DOMContentLoaded', CategoriasPage.init);
