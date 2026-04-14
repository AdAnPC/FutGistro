/* ===================================================
   usuarios.js — Lógica de la vista Gestión de Usuarios
   =================================================== */

let usuariosData = [];
let escuelasData = [];

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
              <h4>Gestión de Usuarios</h4>
              <div class="breadcrumb">Asignar escuelas y roles a cada usuario</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
              <a href="/auth/registro" class="btn-primary-custom" id="btn-new-user">
                <i class="bi bi-person-plus-fill"></i> Nuevo Usuario
              </a>
            </div>
          </div>
          <div class="content-area">
            <div class="data-card fade-in">
              <div class="data-card-header">
                <h5><i class="bi bi-people-fill me-2" style="color:var(--primary)"></i> Usuarios del Sistema</h5>
                <span class="badge-custom gray" id="totalBadge">0 usuarios</span>
              </div>
              <div style="overflow-x:auto">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Usuario</th><th>Email</th><th>Rol</th>
                      <th>Escuela Asignada</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="usuariosBody">
                    <tr><td colspan="5" class="text-center" style="padding:40px;color:var(--text-muted)">Cargando...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="data-card mt-4 fade-in" style="animation-delay:0.1s">
              <div class="data-card-body">
                <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(14,165,233,0.08);border-radius:var(--radius-sm)">
                  <i class="bi bi-info-circle-fill" style="font-size:20px;color:var(--secondary)"></i>
                  <div style="font-size:13px;color:var(--text-secondary)">
                    <strong>¿Cómo funciona?</strong><br>
                    Cada usuario (entrenador/admin) asignado a una escuela <strong>solo podrá ver los jugadores, asistencia y pagos de su escuela</strong>.
                    El <strong>Super Admin</strong> ve todas las escuelas sin restricción.
                    Los usuarios <strong>sin escuela asignada</strong> ven todos los jugadores.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-usuarios')?.classList.add('active');
    await loadEscuelas();
    await loadUsuarios();
}

async function loadEscuelas() {
    try {
        const data = await fetchAPI('/escuelas/');
        if (data && data.success) escuelasData = data.data;
    } catch (e) { console.error(e); }
}

async function loadUsuarios() {
    try {
        const data = await fetchAPI('/auth/usuarios');
        if (data && data.success) {
            usuariosData = data.data;
            renderUsuarios(data.data);
            document.getElementById('totalBadge').textContent = `${data.data.length} usuarios`;
        }
    } catch (e) { console.error(e); }
}

function renderUsuarios(usuarios) {
    const tbody = document.getElementById('usuariosBody');
    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
          <i class="bi bi-people"></i><h5>No hay usuarios</h5>
        </div></td></tr>`;
        return;
    }

    const rolLabels = { superadmin: 'Super Admin', administrador: 'Administrador', entrenador: 'Entrenador' };
    const rolColors = { superadmin: 'amber',       administrador: 'cyan',          entrenador: 'green' };

    tbody.innerHTML = usuarios.map(u => `
        <tr class="fade-in">
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="player-avatar-placeholder">${(u.nombre || 'U').charAt(0).toUpperCase()}</div>
              <div style="font-weight:600">${escapeHtml(u.nombre)}</div>
            </div>
          </td>
          <td style="font-size:13px;color:var(--text-secondary)">${escapeHtml(u.email)}</td>
          <td><span class="badge-custom ${rolColors[u.rol] || 'gray'}">${rolLabels[u.rol] || u.rol}</span></td>
          <td>
            ${u.rol === 'superadmin'
              ? '<span style="font-size:12px;color:var(--text-muted);font-style:italic"><i class="bi bi-globe2"></i> Todas las escuelas</span>'
              : `<select class="form-select-custom" style="min-width:180px;font-size:13px;padding:6px 10px"
                         data-user-id="${u.id}" id="sel-escuela-${u.id}">
                   <option value="">⚠️ Sin asignar</option>
                   ${escuelasData.map(e => `<option value="${e.id}" ${u.escuela_id == e.id ? 'selected' : ''}>${escapeHtml(e.nombre)}</option>`).join('')}
                 </select>`
            }
          </td>
          <td>
            <div style="display:flex;gap:4px">
              ${u.rol !== 'superadmin'
                ? `<button class="btn-icon delete" data-id="${u.id}" data-nombre="${escapeHtml(u.nombre)}" title="Eliminar">
                     <i class="bi bi-trash"></i>
                   </button>`
                : ''}
            </div>
          </td>
        </tr>
    `).join('');

    // Delegación de eventos — sin onclick inline
    tbody.querySelectorAll('select[data-user-id]').forEach(sel => {
        sel.addEventListener('change', () => cambiarEscuela(sel.dataset.userId, sel.value));
    });
    tbody.querySelectorAll('.btn-icon.delete[data-id]').forEach(btn => {
        btn.addEventListener('click', () => eliminarUsuario(btn.dataset.id, btn.dataset.nombre));
    });
}

async function cambiarEscuela(userId, escuelaId) {
    try {
        const data = await fetchAPI(`/auth/usuarios/${userId}`, {
            method: 'PUT',
            body: { escuela_id: escuelaId ? parseInt(escuelaId) : null }
        });
        if (data && data.success) {
            showToast('✅ Escuela asignada. El usuario debe cerrar sesión y volver a entrar para aplicar el cambio.');
        }
    } catch (e) {
        showToast(e.message || 'Error al asignar escuela', 'error');
        await loadUsuarios();
    }
}

async function eliminarUsuario(id, nombre) {
    if (!await confirmAction(`¿Eliminar al usuario "${nombre}"?`)) return;
    try {
        const data = await fetchAPI(`/auth/usuarios/${id}`, { method: 'DELETE' });
        if (data && data.success) {
            showToast('Usuario eliminado');
            await loadUsuarios();
        }
    } catch (e) {
        showToast(e.message || 'Error', 'error');
    }
}
