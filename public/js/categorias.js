/* ===================================================
   categorias.js — Lógica de la vista Categorías
   =================================================== */

let categoriaModal;

document.addEventListener('DOMContentLoaded', () => {
    buildPage();
});

async function buildPage() {
    const user = await loadUserInfo();
    const layout = document.getElementById('appLayout');
    layout.innerHTML = `
        ${renderSidebar(user.nombre, user.rol)}
        <main class="main-content">
          <div class="top-bar">
            <div>
              <button class="menu-toggle" id="menuToggle"><i class="bi bi-list"></i></button>
            </div>
            <div>
              <h4>Categorías</h4>
              <div class="breadcrumb">Gestión de categorías</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
              <button class="btn-primary-custom" id="btn-new-category">
                <i class="bi bi-plus-circle"></i> Nueva Categoría
              </button>
            </div>
          </div>
          <div class="content-area">
            <div class="row g-4" id="categoriasGrid">
              <div class="col-12 text-center" style="padding:60px;color:var(--text-muted)">
                <div class="spinner mx-auto"></div>
                <p style="margin-top:16px">Cargando categorías...</p>
              </div>
            </div>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-categorias')?.classList.add('active');

    document.getElementById('btn-new-category').addEventListener('click', () => openModal());

    categoriaModal = new bootstrap.Modal(document.getElementById('categoriaModal'));
    document.getElementById('categoriaForm').addEventListener('submit', handleSubmit);

    // Listener para autocalcular edades por año
    document.getElementById('anio_nacimiento').addEventListener('input', calcularEdadesPorAnio);

    await loadCategorias();
}

async function loadCategorias() {
    try {
        const data = await fetchAPI('/categorias');
        if (data && data.success) {
            renderCategorias(data.data);
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCategorias(categorias) {
    const grid = document.getElementById('categoriasGrid');

    if (!categorias || categorias.length === 0) {
        grid.innerHTML = `
            <div class="col-12"><div class="empty-state">
              <i class="bi bi-tags"></i><h5>No hay categorías</h5><p>Crea la primera categoría para organizar a tus jugadores</p>
              <button class="btn-primary-custom mt-3" id="btn-empty-new"><i class="bi bi-plus-circle"></i> Nueva Categoría</button>
            </div></div>`;
        document.getElementById('btn-empty-new').addEventListener('click', () => openModal());
        return;
    }

    const colors = [
        { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', accent: '#10b981', icon: 'green' },
        { bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)', accent: '#0ea5e9', icon: 'blue' },
        { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', accent: '#f59e0b', icon: 'amber' },
        { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', accent: '#ef4444', icon: 'red' },
        { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', accent: '#8b5cf6', icon: 'cyan' },
        { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', accent: '#06b6d4', icon: 'cyan' }
    ];

    grid.innerHTML = categorias.map((cat, i) => {
        const color = colors[i % colors.length];
        const total = cat.total_jugadores || 0;
        return `
          <div class="col-lg-4 col-md-6 fade-in" style="animation-delay: ${i * 0.05}s">
            <div class="stat-card" style="border-left:4px solid ${color.accent}">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
                <div class="stat-card-icon ${color.icon}">
                  <i class="bi bi-trophy-fill"></i>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon edit"   data-id="${cat.id}"                          title="Editar"><i class="bi bi-pencil"></i></button>
                  <button class="btn-icon delete" data-id="${cat.id}" data-nombre="${escapeHtml(cat.nombre)}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </div>
              </div>
              <h5 style="font-weight:700;font-size:18px;margin-bottom:4px">${escapeHtml(cat.nombre)}</h5>
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Edades: ${cat.edad_min} - ${cat.edad_max} años</p>
              <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid var(--border-light)">
                <span style="font-size:13px;color:var(--text-secondary)">
                  <i class="bi bi-people-fill me-1"></i> ${total} jugador${total !== 1 ? 'es' : ''}
                </span>
                <a href="/jugadores/page" class="btn-secondary-custom" style="font-size:12px;padding:6px 12px">
                  Ver jugadores <i class="bi bi-arrow-right"></i>
                </a>
              </div>
            </div>
          </div>`;
    }).join('');

    // Delegación de eventos
    grid.addEventListener('click', handleGridClick);
}

function handleGridClick(e) {
    const btnEdit   = e.target.closest('.btn-icon.edit');
    const btnDelete = e.target.closest('.btn-icon.delete');
    if (btnEdit)   editCategoria(btnEdit.dataset.id);
    if (btnDelete) deleteCategoria(btnDelete.dataset.id, btnDelete.dataset.nombre);
}

function openModal(data = null) {
    document.getElementById('categoriaId').value       = data ? data.id     : '';
    document.getElementById('nombre').value            = data ? data.nombre : '';
    document.getElementById('edad_min').value          = data ? data.edad_min : '';
    document.getElementById('edad_max').value          = data ? data.edad_max : '';
    document.getElementById('anio_nacimiento').value   = '';
    document.getElementById('modalTitle').textContent  = data ? 'Editar Categoría' : 'Nueva Categoría';
    categoriaModal.show();
}

function calcularEdadesPorAnio() {
    const val = document.getElementById('anio_nacimiento').value;
    if (val.length === 4) {
        const anio = parseInt(val);
        const currentYear = new Date().getFullYear();
        if (anio > 1900 && anio <= currentYear) {
            const edad = currentYear - anio;
            document.getElementById('edad_min').value = edad;
            document.getElementById('edad_max').value = edad;
        }
    }
}

async function editCategoria(id) {
    try {
        const data = await fetchAPI(`/categorias/${id}`);
        if (data && data.success) {
            openModal(data.data);
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('categoriaId').value;
    const body = {
        nombre:   document.getElementById('nombre').value,
        edad_min: parseInt(document.getElementById('edad_min').value),
        edad_max: parseInt(document.getElementById('edad_max').value)
    };

    try {
        const url    = id ? `/categorias/${id}` : '/categorias';
        const method = id ? 'PUT' : 'POST';
        const data   = await fetchAPI(url, { method, body });

        if (data && data.success) {
            showToast(data.message);
            categoriaModal.hide();
            await loadCategorias();
        }
    } catch (e) {
        showToast(e.message || 'Error al guardar', 'error');
    }
}

async function deleteCategoria(id, nombre) {
    if (!await confirmAction(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
        const data = await fetchAPI(`/categorias/${id}`, { method: 'DELETE' });
        if (data && data.success) {
            showToast('Categoría eliminada');
            await loadCategorias();
        }
    } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
    }
}
