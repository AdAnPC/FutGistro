/* ===================================================
   escuelas.js — Lógica de la vista Escuelas / Sedes
   =================================================== */

let escuelaModal;

document.addEventListener('DOMContentLoaded', () => {
    buildPage();
});

/* ---------- Construcción de la página ---------- */

async function buildPage() {
    const layout = document.getElementById('appLayout');
    layout.innerHTML = `
        ${renderSidebar('Super Admin', 'superadmin')}
        <main class="main-content">
          <div class="top-bar">
            <div>
              <button class="menu-toggle" id="menuToggle"><i class="bi bi-list"></i></button>
            </div>
            <div>
              <h4>Escuelas / Sedes</h4>
              <div class="breadcrumb">Gestión de escuelas registradas</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
              <button class="btn-primary-custom" id="btn-new-school">
                <i class="bi bi-building-add"></i> Nueva Escuela
              </button>
            </div>
          </div>
          <div class="content-area">
            <div class="row g-4" id="escuelasGrid">
              <div class="col-12 text-center" style="padding:60px;color:var(--text-muted)">
                <div class="spinner mx-auto"></div>
                <p style="margin-top:16px">Cargando escuelas...</p>
              </div>
            </div>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-escuelas')?.classList.add('active');

    // Botón "Nueva Escuela" — sin onclick inline
    document.getElementById('btn-new-school').addEventListener('click', () => openModal());

    escuelaModal = new bootstrap.Modal(document.getElementById('escuelaModal'));
    document.getElementById('escuelaForm').addEventListener('submit', handleSubmit);

    await loadEscuelas();
}

/* ---------- Carga de datos ---------- */

async function loadEscuelas() {
    try {
        const data = await fetchAPI('/escuelas');
        if (data && data.success) {
            renderEscuelas(data.data);
        }
    } catch (e) {
        console.error(e);
    }
}

/* ---------- Renderizado ---------- */

function renderEscuelas(escuelas) {
    const grid = document.getElementById('escuelasGrid');

    if (!escuelas || escuelas.length === 0) {
        grid.innerHTML = `
            <div class="col-12">
              <div class="empty-state">
                <i class="bi bi-building"></i>
                <h5>No hay escuelas registradas</h5>
                <p>Registra la primera escuela o sede para comenzar</p>
                <button class="btn-primary-custom mt-3" id="btn-empty-new">
                  <i class="bi bi-building-add"></i> Nueva Escuela
                </button>
              </div>
            </div>`;

        document.getElementById('btn-empty-new').addEventListener('click', () => openModal());
        return;
    }

    const colors = [
        { accent: '#10b981', icon: 'green' },
        { accent: '#0ea5e9', icon: 'blue' },
        { accent: '#f59e0b', icon: 'amber' },
        { accent: '#8b5cf6', icon: 'cyan' },
        { accent: '#ef4444', icon: 'red' },
        { accent: '#06b6d4', icon: 'cyan' }
    ];

    grid.innerHTML = escuelas.map((esc, i) => {
        const color  = colors[i % colors.length];
        const total  = esc.total_jugadores || 0;
        const estado = esc.activa !== false;

        return `
          <div class="col-lg-4 col-md-6 fade-in" style="animation-delay:${i * 0.05}s">
            <div class="stat-card" style="border-left:4px solid ${color.accent}">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
                <div class="stat-card-icon ${color.icon}">
                  <i class="bi bi-building-fill"></i>
                </div>
                <div style="display:flex;gap:4px;align-items:center">
                  <span class="badge-custom ${estado ? 'green' : 'red'}" style="font-size:10px">
                    ${estado ? '● Activa' : '● Inactiva'}
                  </span>
                  <button class="btn-icon edit"   data-id="${esc.id}"                          title="Editar"><i class="bi bi-pencil"></i></button>
                  <button class="btn-icon delete" data-id="${esc.id}" data-nombre="${escapeHtml(esc.nombre)}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </div>
              </div>
              <h5 style="font-weight:700;font-size:18px;margin-bottom:4px">${escapeHtml(esc.nombre)}</h5>

              ${esc.director  ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px"><i class="bi bi-person-fill me-1"></i>${escapeHtml(esc.director)}</p>`  : ''}
              ${esc.departamento && esc.ciudad ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:4px"><i class="bi bi-map me-1"></i>${escapeHtml(esc.ciudad)}, ${escapeHtml(esc.departamento)}</p>` : ''}
              ${esc.direccion  ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:4px"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(esc.direccion)}</p>`  : ''}
              ${esc.telefono   ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:4px"><i class="bi bi-telephone me-1"></i>${escapeHtml(esc.telefono)}</p>`   : ''}
              ${esc.email      ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:4px"><i class="bi bi-envelope me-1"></i>${escapeHtml(esc.email)}</p>`       : ''}
              <p style="font-size:13px;color:var(--primary);margin-bottom:4px;font-weight:600">
                <i class="bi bi-currency-dollar me-1"></i>Mensualidad: $${esc.precio_mensualidad || 0}
              </p>

              <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;margin-top:12px;border-top:1px solid var(--border-light)">
                <span style="font-size:13px;color:var(--text-secondary)">
                  <i class="bi bi-people-fill me-1"></i> ${total} jugador${total !== 1 ? 'es' : ''}
                </span>
              </div>
            </div>
          </div>`;
    }).join('');

    // Delegación de eventos en los botones de cada tarjeta
    grid.addEventListener('click', handleGridClick);
}

function handleGridClick(e) {
    const btnEdit   = e.target.closest('.btn-icon.edit');
    const btnDelete = e.target.closest('.btn-icon.delete');

    if (btnEdit)   editEscuela(btnEdit.dataset.id);
    if (btnDelete) deleteEscuela(btnDelete.dataset.id, btnDelete.dataset.nombre);
}

/* ---------- Modal ---------- */

function openModal(data = null) {
    document.getElementById('escuelaId').value            = data ? data.id            : '';
    document.getElementById('nombre').value               = data ? data.nombre         : '';
    document.getElementById('direccion').value            = data ? (data.direccion     || '') : '';
    document.getElementById('telefono').value             = data ? (data.telefono      || '') : '';
    document.getElementById('director').value             = data ? (data.director      || '') : '';
    document.getElementById('email').value                = data ? (data.email         || '') : '';
    document.getElementById('precio_mensualidad').value   = data ? (data.precio_mensualidad || 0) : 0;
    document.getElementById('modalTitle').textContent     = data ? 'Editar Escuela' : 'Nueva Escuela';

    poblarDepartamentos('departamento');
    if (data && data.departamento) {
        document.getElementById('departamento').value = data.departamento;
        poblarCiudades(data.departamento, 'ciudad');
        if (data.ciudad) document.getElementById('ciudad').value = data.ciudad;
    } else {
        document.getElementById('departamento').value = '';
        poblarCiudades('', 'ciudad');
    }

    // Mostrar selector de estado solo al editar
    const activaGroup = document.getElementById('activaGroup');
    if (data) {
        activaGroup.style.display = 'block';
        document.getElementById('activa').value = data.activa !== false ? 'true' : 'false';
    } else {
        activaGroup.style.display = 'none';
    }

    escuelaModal.show();
}

/* ---------- CRUD ---------- */

async function editEscuela(id) {
    try {
        const data = await fetchAPI(`/escuelas/${id}`);
        if (data && data.success) {
            openModal(data.data);
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('escuelaId').value;
    const body = {
        nombre:             document.getElementById('nombre').value,
        departamento:       document.getElementById('departamento').value,
        ciudad:             document.getElementById('ciudad').value,
        direccion:          document.getElementById('direccion').value,
        telefono:           document.getElementById('telefono').value,
        director:           document.getElementById('director').value,
        email:              document.getElementById('email').value,
        precio_mensualidad: parseFloat(document.getElementById('precio_mensualidad').value) || 0
    };

    if (id) {
        body.activa = document.getElementById('activa').value === 'true';
    }

    try {
        const url    = id ? `/escuelas/${id}` : '/escuelas';
        const method = id ? 'PUT' : 'POST';
        const data   = await fetchAPI(url, { method, body });

        if (data && data.success) {
            showToast(data.message);
            escuelaModal.hide();
            await loadEscuelas();
        }
    } catch (e) {
        showToast(e.message || 'Error al guardar', 'error');
    }
}

async function deleteEscuela(id, nombre) {
    if (!await confirmAction(`¿Eliminar la escuela "${nombre}"? Solo se puede eliminar si no tiene jugadores asignados.`)) return;
    try {
        const data = await fetchAPI(`/escuelas/${id}`, { method: 'DELETE' });
        if (data && data.success) {
            showToast('Escuela eliminada');
            await loadEscuelas();
        }
    } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
    }
}
