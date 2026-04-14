/* ===================================================
   torneos.js — Lógica de la vista Torneos
   =================================================== */

let torneoModal;
let participantesModal;
let partidosModal;
let formPartidoModal;

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
              <h4>Torneos</h4>
              <div class="breadcrumb">Eventos y competencias por ciudad</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
              <button class="btn-primary-custom" id="btn-new-torneo">
                <i class="bi bi-plus-circle"></i> Nuevo Torneo
              </button>
            </div>
          </div>
          <div class="content-area">
            <div class="row g-4" id="torneosGrid">
              <div class="col-12 text-center" style="padding:60px;color:var(--text-muted)">
                <div class="spinner mx-auto"></div>
                <p style="margin-top:16px">Cargando torneos...</p>
              </div>
            </div>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-torneos')?.classList.add('active');

    // Inicializar modales de Bootstrap
    torneoModal = new bootstrap.Modal(document.getElementById('torneoModal'));
    participantesModal = new bootstrap.Modal(document.getElementById('participantesModal'));
    partidosModal = new bootstrap.Modal(document.getElementById('partidosModal'));
    formPartidoModal = new bootstrap.Modal(document.getElementById('formPartidoModal'));

    // Eventos
    document.getElementById('btn-new-torneo').addEventListener('click', () => openModal());
    document.getElementById('torneoForm').addEventListener('submit', handleSubmit);
    document.getElementById('btn-nuevo-partido').addEventListener('click', () => openFormPartido());
    document.getElementById('partidoForm').addEventListener('submit', handleSubmitPartido);
    document.getElementById('torneosGrid').addEventListener('click', handleGridClick);

    // Selectores de ubicación (se asume que colombiaData.js está cargado)
    if (typeof poblarDepartamentos === 'function') {
        poblarDepartamentos('departamento');
        document.getElementById('departamento').addEventListener('change', function() {
            poblarCiudades(this.value, 'ciudad');
        });
    }

    await loadCategorias();
    await loadTorneos();
}

async function loadCategorias() {
    try {
        const data = await fetchAPI('/categorias');
        if (data && data.success) {
            const select = document.getElementById('categoria_id');
            data.data.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = `${cat.nombre} (${cat.edad_min}-${cat.edad_max} años)`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error cargando categorias:', e);
    }
}

async function loadTorneos() {
    try {
        const data = await fetchAPI('/torneos/api');
        if (data && data.success) {
            renderTorneos(data.data);
        }
    } catch (e) {
        console.error('Error cargando torneos:', e);
    }
}

function renderTorneos(torneos) {
    const grid = document.getElementById('torneosGrid');

    if (!torneos || torneos.length === 0) {
        grid.innerHTML = `
            <div class="col-12"><div class="empty-state">
              <i class="bi bi-trophy"></i><h5>No hay torneos registrados</h5>
              <p>Organiza el primer torneo en tu ciudad e integra a las escuelas locales.</p>
              <button class="btn-primary-custom mt-3" onclick="openModal()"><i class="bi bi-plus-circle"></i> Nuevo Torneo</button>
            </div></div>`;
        return;
    }

    grid.innerHTML = torneos.map((t, i) => {
        const badgeClass = t.estado === 'inscripciones' ? 'green' : t.estado === 'en_progreso' ? 'amber' : 'gray';
        const estadoText = t.estado.replace('_', ' ').toUpperCase();
        const user = getUserInfo();
        const isOrganizer = t.organizador_id === user.escuela_id;

        return `
          <div class="col-lg-4 col-md-6 fade-in" style="animation-delay: ${i * 0.05}s">
            <div class="stat-card" style="border-top:3px solid var(--primary)">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                <span class="badge-custom ${badgeClass}" style="font-size:10px">${estadoText}</span>
                <div style="display:flex;gap:4px">
                  ${isOrganizer || user.rol === 'superadmin' ? `
                    <button class="btn-icon edit"   data-id="${t.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon delete" data-id="${t.id}" data-nombre="${escapeHtml(t.nombre)}" title="Eliminar"><i class="bi bi-trash"></i></button>
                  ` : ''}
                </div>
              </div>
              
              <h5 style="font-weight:700;margin-bottom:4px">${escapeHtml(t.nombre)}</h5>
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
                <i class="bi bi-geo-alt-fill me-1" style="color:var(--secondary)"></i> ${escapeHtml(t.ciudad)}
              </p>

              <div style="background:var(--bg-secondary);padding:10px;border-radius:var(--radius-sm);margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                  <span>Categoría:</span>
                  <span style="font-weight:600">${t.categoria ? escapeHtml(t.categoria.nombre) : 'Ref: N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px">
                  <span>Fecha:</span>
                  <span style="font-weight:600">${t.fecha || 'Por definir'}</span>
                </div>
              </div>

              <div style="display:flex;gap:4px">
                <button class="btn-primary-custom w-100 btn-partidos" data-id="${t.id}" style="font-size:12px;padding:8px">
                  <i class="bi bi-calendar3 me-1"></i> Partidos
                </button>
                <button class="btn-secondary-custom w-100 btn-participantes" data-id="${t.id}" style="font-size:12px;padding:8px">
                  <i class="bi bi-building me-1"></i> ${isOrganizer ? 'Escuelas' : 'Info'}
                </button>
              </div>
            </div>
          </div>`;
    }).join('');
}

function handleGridClick(e) {
    const btnEdit = e.target.closest('.btn-icon.edit');
    const btnDelete = e.target.closest('.btn-icon.delete');
    const btnParticipantes = e.target.closest('.btn-participantes');
    const btnPartidos = e.target.closest('.btn-partidos');

    if (btnEdit) editTorneo(btnEdit.dataset.id);
    if (btnDelete) deleteTorneo(btnDelete.dataset.id, btnDelete.dataset.nombre);
    if (btnParticipantes) verParticipantes(btnParticipantes.dataset.id);
    if (btnPartidos) verPartidos(btnPartidos.dataset.id);
}

function openModal(data = null) {
    document.getElementById('torneoId').value = data ? data.id : '';
    document.getElementById('nombre').value = data ? data.nombre : '';
    document.getElementById('fecha').value = data ? data.fecha : '';
    document.getElementById('descripcion').value = data ? data.descripcion || '' : '';
    document.getElementById('estado').value = data ? data.estado : 'inscripciones';
    document.getElementById('categoria_id').value = data ? data.categoria_id : '';

    const user = getUserInfo();

    if (data) {
        // Modo Edición: Cargar ciudad guardada
        if (data.ciudad) {
            document.getElementById('ciudad').innerHTML = `<option value="${data.ciudad}">${data.ciudad}</option>`;
            document.getElementById('ciudad').value = data.ciudad;
        }
    } else {
        // Modo Nuevo: Pre-llenar con la ciudad de la escuela del usuario
        if (user && user.escuela_ciudad) {
            // Si tenemos la información en el objeto user, intentamos pre-poblar
            // Pero necesitamos que el selector de departamento sea consistente
            // Nota: Para simplificar, si no hay data, dejamos que el usuario elija o detectamos su depto
            if (user.escuela_departamento) {
                document.getElementById('departamento').value = user.escuela_departamento;
                poblarCiudades(user.escuela_departamento, 'ciudad');
                document.getElementById('ciudad').value = user.escuela_ciudad;
            } else {
                // Fallback: solo ciudad
                document.getElementById('ciudad').innerHTML = `<option value="${user.escuela_ciudad}">${user.escuela_ciudad}</option>`;
                document.getElementById('ciudad').value = user.escuela_ciudad;
            }
        } else if (user && user.rol !== 'superadmin') {
            showToast('Tu escuela no tiene una ciudad definida. Ve a "Mi Escuela" para configurarla.', 'warning');
        }
    }

    document.getElementById('modalTitle').textContent = data ? 'Editar Torneo' : 'Nuevo Torneo';
    torneoModal.show();
}

async function handleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('torneoId').value;
    const body = {
        nombre: document.getElementById('nombre').value,
        ciudad: document.getElementById('ciudad').value,
        fecha: document.getElementById('fecha').value,
        categoria_id: document.getElementById('categoria_id').value,
        descripcion: document.getElementById('descripcion').value,
        estado: document.getElementById('estado').value
    };

    try {
        const url = id ? `/torneos/api/${id}` : '/torneos/api';
        const method = id ? 'PUT' : 'POST';
        const data = await fetchAPI(url, { method, body });

        if (data && data.success) {
            showToast(data.message);
            torneoModal.hide();
            await loadTorneos();
        }
    } catch (error) {
        showToast(error.message || 'Error al guardar torneo', 'error');
    }
}

async function editTorneo(id) {
    try {
        const data = await fetchAPI(`/torneos/api/${id}`);
        if (data && data.success) {
            openModal(data.data);
        }
    } catch (error) {
        showToast('Error al obtener datos', 'error');
    }
}

async function deleteTorneo(id, nombre) {
    if (!await confirmAction(`¿Seguro que deseas eliminar el torneo "${nombre}"?`, 'Sí, Eliminar')) return;
    try {
        const data = await fetchAPI(`/torneos/api/${id}`, { method: 'DELETE' });
        if (data && data.success) {
            showToast('Torneo eliminado exitosamente');
            await loadTorneos();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function verParticipantes(id) {
    const list = document.getElementById('participantesList');
    list.innerHTML = '<div class="text-center p-4"><div class="spinner"></div></div>';
    participantesModal.show();

    try {
        const data = await fetchAPI(`/torneos/api/${id}`);
        const user = getUserInfo();
        if (data && data.success) {
            const t = data.data;
            const participantes = t.escuelas_participantes || [];
            const isOrganizer = t.organizador_id === user.escuela_id || user.rol === 'superadmin';

            if (participantes.length === 0) {
                list.innerHTML = `
                  <div class="empty-state">
                    <i class="bi bi-info-circle"></i>
                    <p>No hay otras escuelas registradas en la ciudad <strong>${t.ciudad}</strong>.</p>
                  </div>`;
            } else {
                list.innerHTML = `
                  <p class="mb-4 text-muted" style="font-size:14px">
                    Escuelas en <strong>${t.ciudad}</strong>:
                  </p>
                  <div class="list-group">
                    ${participantes.map(esc => {
                        const isMe = esc.id === user.escuela_id;
                        let actionsHtml = '';

                        if (isOrganizer) {
                            if (esc.estado_torneo === 'no_inscrito') {
                                actionsHtml = `
                                    <button class="btn-primary-custom btn-sm btn-invitar" data-torneo="${t.id}" data-escuela="${esc.id}" style="font-size:11px">
                                        Invitar
                                    </button>
                                `;
                                if (esc.telefono) {
                                    const msg = encodeURIComponent(`¡Hola ${esc.nombre}! Te invitamos al torneo "${t.nombre}" en futGistro. ¿Te gustaría participar?`);
                                    actionsHtml += `
                                        <a href="https://wa.me/57${esc.telefono}?text=${msg}" target="_blank" class="btn-secondary-custom btn-sm" style="font-size:11px;background:#25D366;color:white;border:none">
                                            <i class="bi bi-whatsapp"></i>
                                        </a>`;
                                }
                            } else if (esc.estado_torneo === 'pendiente') {
                                actionsHtml = `
                                    <div style="display:flex;gap:4px">
                                        <button class="btn-icon green btn-confirmar" data-torneo="${t.id}" data-escuela="${esc.id}" title="Confirmar"><i class="bi bi-check-lg"></i></button>
                                        <button class="btn-icon red btn-rechazar" data-torneo="${t.id}" data-escuela="${esc.id}" title="Rechazar"><i class="bi bi-x-lg"></i></button>
                                    </div>
                                `;
                            }
                        } else if (isMe) {
                            if (esc.estado_torneo === 'no_inscrito') {
                                actionsHtml = `
                                    <button class="btn-primary-custom btn-sm btn-participar" data-torneo="${t.id}" style="font-size:11px">
                                        Inscribirme
                                    </button>
                                `;
                            } else if (esc.estado_torneo === 'invitado') {
                                actionsHtml = `
                                    <div style="display:flex;gap:4px">
                                        <button class="btn-primary-custom btn-sm btn-confirmar" data-torneo="${t.id}" data-escuela="${esc.id}" style="font-size:11px">
                                            Aceptar
                                        </button>
                                        <button class="btn-secondary-custom btn-sm btn-rechazar" data-torneo="${t.id}" data-escuela="${esc.id}" style="font-size:11px">
                                            Rechazar
                                        </button>
                                    </div>
                                `;
                            }
                        }

                        const statusLabels = {
                            confirmado: { text: 'CONFIRMADO', class: 'green' },
                            invitado: { text: 'INVITADO', class: 'blue' },
                            pendiente: { text: 'PENDIENTE', class: 'amber' },
                            no_inscrito: { text: 'NO INSCRITO', class: 'gray' }
                        };
                        const label = statusLabels[esc.estado_torneo] || { text: esc.estado_torneo, class: 'gray' };

                        return `
                          <div class="list-group-item d-flex align-items-center gap-3 py-3">
                            ${esc.logo 
                              ? `<img src="${esc.logo}" style="width:40px;height:40px;object-fit:contain;border-radius:4px">` 
                              : `<div style="width:40px;height:40px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;border-radius:4px"><i class="bi bi-building"></i></div>`}
                            <div class="flex-grow-1">
                              <h6 class="mb-0 font-weight-bold" style="font-size:14px">${escapeHtml(esc.nombre)} ${isMe ? '<small>(Tú)</small>' : ''}</h6>
                              <div style="font-size:11px;color:var(--text-muted)">
                                <i class="bi bi-telephone me-1"></i> ${esc.telefono || 'Sin teléfono'}
                              </div>
                            </div>
                            <div style="display:flex;flex-direction:column;align-items:end;gap:8px">
                                <span class="badge-custom ${label.class}" style="font-size:9px">${label.text}</span>
                                <div style="display:flex;gap:4px">${actionsHtml}</div>
                            </div>
                          </div>
                    `}).join('')}
                  </div>`;
            }

            // Delegación de eventos dentro del modal
            list.querySelectorAll('.btn-invitar').forEach(b => b.onclick = () => invitarEscuela(b.dataset.torneo, b.dataset.escuela));
            list.querySelectorAll('.btn-participar').forEach(b => b.onclick = () => inscribirseTorneo(b.dataset.torneo));
            list.querySelectorAll('.btn-confirmar').forEach(b => b.onclick = () => cambiarEstado(b.dataset.torneo, b.dataset.escuela, 'confirmado'));
            list.querySelectorAll('.btn-rechazar').forEach(b => b.onclick = () => cambiarEstado(b.dataset.torneo, b.dataset.escuela, 'rechazado'));
        }
    } catch (error) {
        list.innerHTML = '<p class="text-danger text-center">Error al cargar participantes</p>';
    }
}

async function inscribirseTorneo(torneoId) {
    try {
        const data = await fetchAPI(`/torneos/api/${torneoId}/participar`, { method: 'POST' });
        if (data && data.success) {
            showToast(data.message);
            verParticipantes(torneoId);
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function invitarEscuela(torneoId, escuelaId) {
    try {
        const data = await fetchAPI(`/torneos/api/${torneoId}/invitar`, { 
            method: 'POST', 
            body: { escuela_id: escuelaId } 
        });
        if (data && data.success) {
            showToast(data.message);
            verParticipantes(torneoId);
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function cambiarEstado(torneoId, escuelaId, nuevoEstado) {
    const isConfirm = nuevoEstado === 'confirmado';
    const msg = `¿Deseas ${isConfirm ? 'CONFIRMAR' : 'RECHAZAR'} esta participación?`;
    const btnText = isConfirm ? 'Sí, Confirmar' : 'Sí, Rechazar';
    const btnClass = isConfirm ? 'btn-primary-custom' : 'btn-danger-custom';

    if (!await confirmAction(msg, btnText, btnClass)) return;
    try {
        const data = await fetchAPI(`/torneos/api/${torneoId}/participantes/${escuelaId}`, { 
            method: 'PUT', 
            body: { estado: nuevoEstado } 
        });
        if (data && data.success) {
            showToast(data.message);
            verParticipantes(torneoId);
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* ===================================================
   GESTIÓN DE PARTIDOS (EL VS)
   =================================================== */

async function verPartidos(torneoId) {
    const list = document.getElementById('partidosList');
    list.innerHTML = '<div class="col-12 text-center p-5"><div class="spinner mx-auto"></div></div>';
    document.getElementById('torneoIdPartidos').value = torneoId;
    partidosModal.show();

    try {
        const data = await fetchAPI(`/torneos/api/${torneoId}/partidos`);
        const torneoData = await fetchAPI(`/torneos/api/${torneoId}`);
        const user = getUserInfo();
        const isOrganizer = torneoData.data.organizador_id === user.escuela_id || user.rol === 'superadmin';

        // Ocultar botón de nuevo partido si no es organizador
        document.getElementById('btn-nuevo-partido').style.display = isOrganizer ? 'block' : 'none';

        if (data && data.success) {
            const partidos = data.data;
            if (partidos.length === 0) {
                list.innerHTML = `
                    <div class="col-12"><div class="empty-state">
                        <i class="bi bi-calendar-x"></i>
                        <p>No hay partidos programados todavía.</p>
                        ${isOrganizer ? '<button class="btn-primary-custom mt-2" onclick="openFormPartido()">Programar Primer VS</button>' : ''}
                    </div></div>`;
            } else {
                list.innerHTML = partidos.map(p => {
                    const localNombre = p.escuela_local ? p.escuela_local.nombre : (p.nombre_local_manual || 'Por definir');
                    const visitanteNombre = p.escuela_visitante ? p.escuela_visitante.nombre : (p.nombre_visitante_manual || 'Por definir');
                    const localLogo = p.escuela_local?.logo || '/icons/fut.jpeg';
                    const visitanteLogo = p.escuela_visitante?.logo || '/icons/fut.jpeg';

                    return `
                        <div class="col-md-6 col-lg-4">
                            <div class="stat-card" style="padding:16px">
                                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:12px">
                                    <span>${p.fecha_partido || 'Fecha TBD'} - ${p.hora || ''}</span>
                                    <span class="badge-custom ${p.estado === 'finalizado' ? 'gray' : 'blue'}" style="font-size:9px">${p.estado.toUpperCase()}</span>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:15px">
                                    <div style="text-align:center;width:40%">
                                        <img src="${localLogo}" style="height:40px;width:40px;object-fit:contain;margin-bottom:6px">
                                        <div style="font-size:12px;font-weight:700;line-height:1.2;height:2.4em;overflow:hidden">${escapeHtml(localNombre)}</div>
                                    </div>
                                    <div style="font-size:20px;font-weight:800;color:var(--primary)">${p.goles_local}</div>
                                    <div style="font-weight:700;color:var(--text-muted)">VS</div>
                                    <div style="font-size:20px;font-weight:800;color:var(--primary)">${p.goles_visitante}</div>
                                    <div style="text-align:center;width:40%">
                                        <img src="${visitanteLogo}" style="height:40px;width:40px;object-fit:contain;margin-bottom:6px">
                                        <div style="font-size:12px;font-weight:700;line-height:1.2;height:2.4em;overflow:hidden">${escapeHtml(visitanteNombre)}</div>
                                    </div>
                                </div>
                                ${isOrganizer ? `
                                <div style="display:flex;gap:8px;border-top:1px solid var(--border-light);padding-top:12px">
                                    <button class="btn-secondary-custom w-100 btn-edit-partido" style="font-size:11px;padding:4px" data-id="${p.id}">
                                        <i class="bi bi-pencil"></i> Resultado
                                    </button>
                                    <button class="btn-icon red btn-delete-partido" data-id="${p.id}" data-torneo="${p.torneo_id}">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                // Eventos de botones de partido
                list.querySelectorAll('.btn-edit-partido').forEach(b => b.onclick = () => editPartido(b.dataset.id));
                list.querySelectorAll('.btn-delete-partido').forEach(b => b.onclick = () => deletePartido(b.dataset.id, b.dataset.torneo));
            }
        }
    } catch (e) {
        list.innerHTML = '<p class="text-danger">Error al cargar el calendario.</p>';
    }
}

async function openFormPartido(partido = null) {
    const torneoId = document.getElementById('torneoIdPartidos').value;
    document.getElementById('partidoId').value = partido ? partido.id : '';
    document.getElementById('fecha_partido').value = partido ? partido.fecha_partido : getTodayStr();
    document.getElementById('hora').value = partido ? (partido.hora ? partido.hora.substring(0,5) : '08:00') : '08:00';
    document.getElementById('goles_local').value = partido ? partido.goles_local : 0;
    document.getElementById('goles_visitante').value = partido ? partido.goles_visitante : 0;
    document.getElementById('estado_partido').value = partido ? partido.estado : 'programado';
    document.getElementById('observaciones').value = partido ? (partido.observaciones || '') : '';
    document.getElementById('formPartidoTitle').textContent = partido ? 'Actualizar Resultado' : 'Programar VS';

    // Cargar selectores de escuelas confirmadas
    try {
        const data = await fetchAPI(`/torneos/api/${torneoId}`);
        if (data && data.success) {
            const confirmed = data.data.escuelas_participantes.filter(e => e.estado_torneo === 'confirmado');
            const localSel = document.getElementById('escuela_local_id');
            const visitSel = document.getElementById('escuela_visitante_id');
            
            const options = confirmed.map(e => `<option value="${e.id}">${escapeHtml(e.nombre)}</option>`).join('');
            const placeholder = '<option value="">Seleccionar equipo...</option>';
            
            localSel.innerHTML = placeholder + options;
            visitSel.innerHTML = placeholder + options;

            if (partido) {
                localSel.value = partido.escuela_local_id || '';
                visitSel.value = partido.escuela_visitante_id || '';
            }
        }
    } catch (e) {
        showToast('Error cargando equipos', 'error');
    }

    formPartidoModal.show();
}

async function handleSubmitPartido(e) {
    e.preventDefault();
    const id = document.getElementById('partidoId').value;
    const torneoId = document.getElementById('torneoIdPartidos').value;
    const body = {
        torneo_id: torneoId,
        escuela_local_id: document.getElementById('escuela_local_id').value || null,
        escuela_visitante_id: document.getElementById('escuela_visitante_id').value || null,
        fecha_partido: document.getElementById('fecha_partido').value,
        hora: document.getElementById('hora').value,
        goles_local: document.getElementById('goles_local').value,
        goles_visitante: document.getElementById('goles_visitante').value,
        estado: document.getElementById('estado_partido').value,
        observaciones: document.getElementById('observaciones').value
    };

    if (body.escuela_local_id === body.escuela_visitante_id && body.escuela_local_id !== null) {
        return showToast('Un equipo no puede jugar contra sí mismo', 'warning');
    }

    try {
        const url = id ? `/torneos/api/partidos/${id}` : `/torneos/api/${torneoId}/partidos`;
        const method = id ? 'PUT' : 'POST';
        const data = await fetchAPI(url, { method, body });

        if (data && data.success) {
            showToast(data.message);
            formPartidoModal.hide();
            await verPartidos(torneoId);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function editPartido(id) {
    try {
        const data = await fetchAPI(`/torneos/api/partidos/${id}`);
        if (data && data.success) {
            openFormPartido(data.data);
        }
    } catch(err) {
        showToast('Error al cargar datos del partido', 'error');
    }
}

async function deletePartido(id, torneoId) {
    if (!await confirmAction('¿Deseas eliminar este enfrentamiento?', 'Sí, Eliminar')) return;
    try {
        const data = await fetchAPI(`/torneos/api/partidos/${id}`, { method: 'DELETE' });
        if (data && data.success) {
            showToast('Partido eliminado');
            await verPartidos(torneoId);
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

