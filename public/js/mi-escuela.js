/* ===================================================
   mi-escuela.js — Lógica de la vista Mi Escuela
   =================================================== */

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
                    <h4>Mi Escuela</h4>
                    <div class="breadcrumb">Configuración y personalización de tu escuela</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <a href="/dashboard" class="btn-secondary-custom" style="padding:4px 8px;font-size:12px">
                        <i class="bi bi-arrow-left"></i> Volver
                    </a>
                </div>
            </div>
            <div class="content-area">
                <div class="data-card mb-4 fade-in" style="max-width:600px;margin:0 auto;">
                    <div class="data-card-header">
                        <h5><i class="bi bi-building"></i> Datos de Mi Escuela</h5>
                    </div>
                    <div class="data-card-body">
                        <form id="miEscuelaForm" enctype="multipart/form-data">
                            <div class="row g-3">
                                <div class="col-12 text-center mb-3">
                                    <label class="form-label-custom d-block">Logo de la Escuela</label>
                                    <div class="file-upload-area" style="max-width:200px;margin:0 auto;" id="logoUploadArea">
                                        <i class="bi bi-image d-block" id="logoIcon"></i>
                                        <p id="logoText">Clic para subir logo</p>
                                        <div id="logoPreview"></div>
                                    </div>
                                    <input type="file" id="logo" name="logo" accept="image/*" style="display:none">
                                </div>
                                <div class="col-md-12">
                                    <label for="nombre" class="form-label-custom">Nombre de la escuela</label>
                                    <input type="text" id="nombre" class="form-control-custom" readonly style="background:var(--bg-secondary);">
                                </div>
                                <div class="col-md-12">
                                    <label for="director" class="form-label-custom">Director / Responsable</label>
                                    <input type="text" id="director" name="director" class="form-control-custom">
                                </div>
                                <div class="col-md-12">
                                    <label for="precio_mensualidad" class="form-label-custom">Cobro Base de Mensualidad ($)</label>
                                    <input type="number" id="precio_mensualidad" name="precio_mensualidad" class="form-control-custom" placeholder="Ej: 50000" min="0" step="100">
                                    <div style="font-size:12px;color:var(--text-muted);margin-top:4px"><i class="bi bi-info-circle"></i> Este será el valor automático que se aplique cada vez que generes o cobres un mes a cualquier jugador de tu escuela.</div>
                                </div>
                                <div class="col-md-12">
                                    <label for="direccion" class="form-label-custom">Dirección</label>
                                    <input type="text" id="direccion" name="direccion" class="form-control-custom">
                                </div>
                                <div class="col-md-6">
                                    <label for="departamento" class="form-label-custom">Departamento</label>
                                    <select id="departamento" name="departamento" class="form-select-custom"></select>
                                </div>
                                <div class="col-md-6">
                                    <label for="ciudad" class="form-label-custom">Ciudad</label>
                                    <select id="ciudad" name="ciudad" class="form-select-custom"></select>
                                </div>
                                <div class="col-md-6">
                                    <label for="telefono" class="form-label-custom">Teléfono</label>
                                    <input type="text" id="telefono" name="telefono" class="form-control-custom">
                                </div>
                                <div class="col-md-6">
                                    <label for="email" class="form-label-custom">Email</label>
                                    <input type="email" id="email" name="email" class="form-control-custom">
                                </div>
                            </div>
                            <button type="submit" class="btn-primary-custom w-100 mt-4" id="btnSave">
                                <i class="bi bi-save"></i> Guardar Cambios
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-mi-escuela')?.classList.add('active');

    // Eventos — sin inline
    document.getElementById('logoUploadArea').addEventListener('click', () => {
        document.getElementById('logo').click();
    });
    document.getElementById('logo').addEventListener('change', previewLogo);
    document.getElementById('logo_url').addEventListener('input', function() {
        const url = this.value.trim();
        if (url) {
            document.getElementById('logoIcon').style.display = 'none';
            document.getElementById('logoText').style.display = 'none';
            
            let displayUrl = url;
            if (url.includes('drive.google.com')) {
                const fileId = url.match(/\/file\/d\/([^\/?]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1];
                if (fileId) {
                    displayUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
                    console.log('Detectado Google Drive ID:', fileId, '->', displayUrl);
                }
            }
            
            document.getElementById('logoPreview').innerHTML = `<img src="${displayUrl}" style="max-width:100%;border-radius:8px;" onerror="this.src='/icons/fut.jpeg';console.error('Error cargando imagen de URL:', this.src)">`;
        }
    });
    document.getElementById('miEscuelaForm').addEventListener('submit', handleSubmit);

    // Inicializar selectores de ubicación
    if (typeof poblarDepartamentos === 'function') {
        poblarDepartamentos('departamento');
        document.getElementById('departamento').addEventListener('change', function() {
            poblarCiudades(this.value, 'ciudad');
        });
    }

    await loadData();
}

async function loadData() {
    try {
        showLoading();
        const res = await fetchAPI('/escuelas/mi-escuela/api');
        hideLoading();
        if (res && res.success) {
            const esc = res.data;
            document.getElementById('nombre').value             = esc.nombre || '';
            document.getElementById('director').value           = esc.director || '';
            document.getElementById('direccion').value          = esc.direccion || '';
            document.getElementById('telefono').value           = esc.telefono || '';
            document.getElementById('email').value              = esc.email || '';
            document.getElementById('precio_mensualidad').value = esc.precio_mensualidad || 0;
            
            // Cargar ubicación
            if (esc.departamento) {
                document.getElementById('departamento').value = esc.departamento;
                poblarCiudades(esc.departamento, 'ciudad');
                if (esc.ciudad) {
                    document.getElementById('ciudad').value = esc.ciudad;
                }
            } else if (esc.ciudad) {
                // Fallback si solo hay ciudad
                const opt = document.createElement('option');
                opt.value = esc.ciudad;
                opt.textContent = esc.ciudad;
                document.getElementById('ciudad').appendChild(opt);
                document.getElementById('ciudad').value = esc.ciudad;
            }

            if (esc.logo) {
                document.getElementById('logoIcon').style.display = 'none';
                document.getElementById('logoText').style.display = 'none';
                document.getElementById('logoPreview').innerHTML  = `<img src="${esc.logo}" style="max-width:100%;border-radius:8px;">`;
                
                // Si el logo parece una URL externa, lo ponemos en el campo de texto
                if (esc.logo.startsWith('http')) {
                    document.getElementById('logo_url').value = esc.logo;
                }
            }
        }
    } catch (e) {
        hideLoading();
        showToast(e.message, 'error');
    }
}

function previewLogo() {
    const file = document.getElementById('logo').files[0];
    if (file) {
        document.getElementById('logoIcon').style.display = 'none';
        document.getElementById('logoText').style.display = 'none';
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('logoPreview').innerHTML = `<img src="${e.target.result}" style="max-width:100%;border-radius:8px;">`;
        };
        reader.readAsDataURL(file);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></div> Guardando...';

    const formData = new FormData();
    formData.append('director',           document.getElementById('director').value);
    formData.append('direccion',          document.getElementById('direccion').value);
    formData.append('telefono',           document.getElementById('telefono').value);
    formData.append('email',              document.getElementById('email').value);
    formData.append('precio_mensualidad', document.getElementById('precio_mensualidad').value || 0);
    formData.append('departamento',       document.getElementById('departamento').value);
    formData.append('ciudad',             document.getElementById('ciudad').value);
    formData.append('logo_url',           document.getElementById('logo_url').value);

    const file = document.getElementById('logo').files[0];
    if (file) formData.append('logo', file);

    try {
        const res  = await fetch('/escuelas/mi-escuela/api', { method: 'PUT', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error');

        showToast(data.message);
        if (data.data.logo) {
            document.getElementById('logoPreview').innerHTML = `<img src="${data.data.logo}" style="max-width:100%;border-radius:8px;">`;
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="bi bi-save"></i> Guardar Cambios';
    }
}

