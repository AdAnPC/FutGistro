/* ===================================================
   jugadores-formulario.js — Lógica del Formulario de Jugadores
   =================================================== */

let isEditing          = false;
let jugadorId          = null;
let signaturePad       = null;
let signaturePadEntrenador = null;

document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts.includes('editar') && pathParts.length > 3) {
        isEditing = true;
        jugadorId = pathParts[pathParts.length - 1];
    }
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
              <h4>${isEditing ? 'Editar Jugador' : 'Nuevo Jugador'}</h4>
              <div class="breadcrumb">
                <a href="/jugadores/page" style="color:var(--text-muted);text-decoration:none">Jugadores</a> / ${isEditing ? 'Editar' : 'Nuevo'}
              </div>
            </div>
            <div>
              <a href="/jugadores/page" class="btn-secondary-custom" id="btn-back" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-arrow-left"></i> Volver
              </a>
            </div>
          </div>
          <div class="content-area">
            <form id="jugadorForm" enctype="multipart/form-data">
              <!-- Personal Data -->
              <div class="data-card mb-4 fade-in" id="section1">
                <div class="data-card-header">
                  <h5><i class="bi bi-person-fill me-2" style="color:var(--primary)"></i> Datos Personales</h5>
                </div>
                <div class="data-card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="nombre" class="form-label-custom">Nombre completo *</label>
                      <input type="text" id="nombre" name="nombre" class="form-control-custom" placeholder="Nombre completo del jugador" required>
                    </div>
                    <div class="col-md-6">
                      <label for="fecha_nacimiento" class="form-label-custom">Fecha de nacimiento *</label>
                      <input type="date" id="fecha_nacimiento" name="fecha_nacimiento" class="form-control-custom" required>
                    </div>
                    <div class="col-md-6">
                      <label for="departamento_nacimiento" class="form-label-custom">Dpto. Nacimiento</label>
                      <select id="departamento_nacimiento" name="departamento_nacimiento" class="form-select-custom"></select>
                    </div>
                    <div class="col-md-6">
                      <label for="lugar_nacimiento" class="form-label-custom">Ciudad Nacimiento</label>
                      <select id="lugar_nacimiento" name="lugar_nacimiento" class="form-select-custom"></select>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label-custom">Edad</label>
                      <input type="text" id="edad_display" class="form-control-custom" readonly placeholder="Se calcula automáticamente" style="background:var(--bg-secondary)">
                    </div>
                    <div class="col-md-3">
                      <label for="documento" class="form-label-custom">Documento / Registro civil *</label>
                      <input type="text" id="documento" name="documento" class="form-control-custom" placeholder="N° de documento" required>
                    </div>
                    <div class="col-md-3">
                      <label for="tipo_sangre" class="form-label-custom">Tipo de sangre y RH</label>
                      <input type="text" id="tipo_sangre" name="tipo_sangre" class="form-control-custom" placeholder="Ej: O+">
                    </div>
                    <div class="col-md-3">
                      <label for="eps" class="form-label-custom">EPS</label>
                      <input type="text" id="eps" name="eps" class="form-control-custom" placeholder="Nombre de EPS">
                    </div>
                    <div class="col-md-3">
                      <label for="estatura" class="form-label-custom">Estatura</label>
                      <input type="text" id="estatura" name="estatura" class="form-control-custom" placeholder="Ej: 1.50m">
                    </div>
                    <div class="col-md-3">
                      <label for="peso" class="form-label-custom">Peso</label>
                      <input type="text" id="peso" name="peso" class="form-control-custom" placeholder="Ej: 45kg">
                    </div>
                    <div class="col-md-3">
                      <label for="departamento_residencia" class="form-label-custom">Dpto. Residencia</label>
                      <select id="departamento_residencia" name="departamento_residencia" class="form-select-custom"></select>
                    </div>
                    <div class="col-md-3">
                      <label for="ciudad" class="form-label-custom">Ciudad Residencia</label>
                      <select id="ciudad" name="ciudad" class="form-select-custom"></select>
                    </div>
                    <div class="col-md-4">
                      <label for="direccion" class="form-label-custom">Dirección de Domicilio</label>
                      <input type="text" id="direccion" name="direccion" class="form-control-custom" placeholder="Dirección del jugador">
                    </div>
                    <div class="col-md-4">
                      <label for="numero_fijo" class="form-label-custom">Celular 1</label>
                      <input type="tel" id="numero_fijo" name="numero_fijo" class="form-control-custom" placeholder="Celular">
                    </div>
                    <div class="col-md-4">
                      <label for="telefono" class="form-label-custom">Número Celular</label>
                      <input type="tel" id="telefono" name="telefono" class="form-control-custom" placeholder="Celular del jugador">
                    </div>
                  </div>
                  <button type="button" class="btn-primary-custom w-100 mt-4" id="btn-next-1" style="display:none;">Continuar a Datos del Padre <i class="bi bi-arrow-down-circle ms-1"></i></button>
                </div>
              </div>

              <!-- Parent/Guardian Data -->
              <div class="data-card mb-4 fade-in" id="section2" style="animation-delay:0.1s;display:none;">
                <div class="data-card-header">
                  <h5><i class="bi bi-people-fill me-2" style="color:var(--secondary)"></i> Datos del Padre / Acudiente</h5>
                </div>
                <div class="data-card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="nombre_padre" class="form-label-custom">Nombre del padre / acudiente</label>
                      <input type="text" id="nombre_padre" name="nombre_padre" class="form-control-custom" placeholder="Nombre completo del padre o tutor">
                    </div>
                    <div class="col-md-6">
                      <label for="cc_padre" class="form-label-custom">Número de CC (Padre)</label>
                      <input type="text" id="cc_padre" name="cc_padre" class="form-control-custom" placeholder="Cédula del padre">
                    </div>
                    <div class="col-md-6">
                      <label for="nombre_madre" class="form-label-custom">Nombre de la madre</label>
                      <input type="text" id="nombre_madre" name="nombre_madre" class="form-control-custom" placeholder="Nombre completo de la madre (opcional)">
                    </div>
                    <div class="col-md-6">
                      <label for="cc_madre" class="form-label-custom">Número de CC (Madre)</label>
                      <input type="text" id="cc_madre" name="cc_madre" class="form-control-custom" placeholder="Cédula de la madre">
                    </div>
                    <div class="col-md-12">
                      <label for="telefono_padre" class="form-label-custom">Teléfono del Acudiente / Emergencia</label>
                      <input type="tel" id="telefono_padre" name="telefono_padre" class="form-control-custom" placeholder="Teléfono de contacto">
                    </div>
                  </div>
                  <button type="button" class="btn-primary-custom w-100 mt-4" id="btn-next-2">Continuar a Datos de Inscripción <i class="bi bi-arrow-down-circle ms-1"></i></button>
                </div>
              </div>

              <!-- School Data -->
              <div class="data-card mb-4 fade-in" id="section3" style="animation-delay:0.15s;display:none;">
                <div class="data-card-header">
                  <h5><i class="bi bi-trophy-fill me-2" style="color:var(--accent)"></i> Datos de Inscripción</h5>
                </div>
                <div class="data-card-body">
                  <div class="row g-3">
                    <div class="col-md-4">
                      <label for="categoria_id" class="form-label-custom">Categoría</label>
                      <select id="categoria_id" name="categoria_id" class="form-select-custom">
                        <option value="">Seleccionar categoría...</option>
                      </select>
                    </div>
                    <div class="col-md-4" id="escuelaField">
                      <label for="escuela_id" class="form-label-custom">Escuela / Sede</label>
                      <input type="text" id="escuela_display" class="form-control-custom" readonly style="background:var(--bg-secondary)">
                      <input type="hidden" id="escuela_id" name="escuela_id">
                    </div>
                    <div class="col-md-4">
                      <label for="fecha_registro" class="form-label-custom">Fecha de inscripción</label>
                      <input type="date" id="fecha_registro" name="fecha_registro" class="form-control-custom">
                    </div>
                  </div>
                  <button type="button" class="btn-primary-custom w-100 mt-4" id="btn-next-3">Continuar a Documentos y Fotos <i class="bi bi-arrow-down-circle ms-1"></i></button>
                </div>
              </div>

              <!-- Documents / Photos -->
              <div class="data-card mb-4 fade-in" id="section4" style="animation-delay:0.2s;display:none;">
                <div class="data-card-header">
                  <h5><i class="bi bi-file-earmark-image-fill me-2" style="color:var(--info)"></i> Documentos y Fotos</h5>
                  <span class="badge-custom gray" style="font-size:11px" id="fileCountBadge"><i class="bi bi-info-circle me-1"></i>0 / 7 archivos</span>
                </div>
                <div class="data-card-body">
                  <div class="row g-4" id="uploadsContainer">
                    ${[
                      { slot:1, id:'foto',              preview:'fotoPreview',         icon:'bi-camera-fill',                  label:'1. Foto del jugador'              },
                      { slot:2, id:'documento_extra2',  preview:'docExtra2Preview',    icon:'bi-file-earmark-person-fill',     label:'2. Tarjeta Identidad (Frente)'    },
                      { slot:3, id:'documento_extra4',  preview:'docExtra4Preview',    icon:'bi-file-earmark-person-fill',     label:'3. Tarjeta Identidad (Reverso)'   },
                      { slot:4, id:'registro_civil',    preview:'registroCivilPreview',icon:'bi-file-earmark-text-fill',       label:'4. Registro civil'                },
                      { slot:5, id:'documento_acudiente',preview:'docAcudientePreview',icon:'bi-file-earmark-person-fill',    label:'5. Documento del padre o madre'   },
                      { slot:6, id:'documento_extra1',  preview:'docExtra1Preview',    icon:'bi-file-earmark-plus-fill',       label:'6. Certificado de EPS'            },
                      { slot:7, id:'documento_extra3',  preview:'docExtra3Preview',    icon:'bi-file-earmark-plus-fill',       label:'7. Certificado de estudio'        }
                    ].map(s => `
                      <div class="col-md-4 upload-slot" id="uploadSlot${s.slot}">
                        <label class="form-label-custom">${s.label}</label>
                        <div class="file-upload-area" data-input="${s.id}">
                          <i class="bi ${s.icon} d-block"></i>
                          <p>Clic para subir</p>
                          <div id="${s.preview}"></div>
                        </div>
                        <input type="file" id="${s.id}" name="${s.id}" accept="image/*,.pdf" style="display:none" data-slot="${s.slot}">
                      </div>`).join('')}
                  </div>
                  <button type="button" class="btn-primary-custom w-100 mt-4" id="btn-next-4">Continuar a Firma Digital <i class="bi bi-arrow-down-circle ms-1"></i></button>
                </div>
              </div>

              <!-- Digital Signatures -->
              <div class="data-card mb-4 fade-in" id="section5" style="animation-delay:0.25s;display:none;">
                <div class="data-card-header">
                  <h5><i class="bi bi-pen-fill me-2" style="color:var(--primary)"></i> Firmas de Autorización</h5>
                </div>
                <div class="data-card-body">
                  <div class="row g-4">
                    <div class="col-md-6">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label-custom mb-0">Firma del Padre o Acudiente</label>
                        <button type="button" class="btn-icon" id="btn-clear-sig1" title="Limpiar firma"><i class="bi bi-eraser"></i></button>
                      </div>
                      <div class="signature-container" id="signatureContainer">
                        <canvas id="signatureCanvas"></canvas>
                      </div>
                      <div id="existingSignature" style="display:none;margin-top:12px">
                        <p style="font-size:12px;color:var(--text-muted)">Firma actual:</p>
                        <img id="existingSignatureImg" style="max-width:200px;border:1px solid var(--border-color);border-radius:var(--radius-sm)">
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label-custom mb-0">Firma del Entrenador</label>
                        <button type="button" class="btn-icon" id="btn-clear-sig2" title="Limpiar firma"><i class="bi bi-eraser"></i></button>
                      </div>
                      <div class="signature-container" id="signatureContainerEntrenador">
                        <canvas id="signatureCanvasEntrenador"></canvas>
                      </div>
                      <div id="existingSignatureEntrenador" style="display:none;margin-top:12px">
                        <p style="font-size:12px;color:var(--text-muted)">Firma actual:</p>
                        <img id="existingSignatureImgEntrenador" style="max-width:200px;border:1px solid var(--border-color);border-radius:var(--radius-sm)">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit -->
              <div class="d-flex gap-3 justify-content-end mb-4 fade-in" id="section-submit" style="display:none!important;">
                <a href="/jugadores/page" class="btn-secondary-custom" id="btn-cancel"><i class="bi bi-x-circle"></i> Cancelar</a>
                <button type="submit" class="btn-primary-custom" id="btn-submit">
                  <i class="bi bi-check-circle"></i> ${isEditing ? 'Actualizar Jugador' : 'Registrar Jugador'}
                </button>
              </div>
            </form>
          </div>
        </main>
    `;

    initSidebar();
    document.getElementById('nav-jugadores')?.classList.add('active');

    // Setup file upload areas — sin onclick inline
    document.querySelectorAll('.file-upload-area[data-input]').forEach(area => {
        area.addEventListener('click', () => document.getElementById(area.dataset.input)?.click());
    });
    document.querySelectorAll('input[type="file"][data-slot]').forEach(input => {
        input.addEventListener('change', () => onFileSlotChange(parseInt(input.dataset.slot)));
    });

    // Solo números en campos numéricos
    ['documento', 'numero_fijo', 'telefono', 'cc_padre', 'cc_madre', 'telefono_padre'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', function() {
            const v = this.value.replace(/[^0-9]/g, '');
            if (this.value !== v) this.value = v;
        });
    });

    // Solo alfanuméricos + y - en tipo_sangre
    document.getElementById('tipo_sangre')?.addEventListener('input', function() {
        const v = this.value.replace(/[^a-zA-Z0-9+\-]/g, '');
        if (this.value !== v) this.value = v;
    });

    updateFileCount();

    if (isEditing) showAllSections();
    else           document.getElementById('btn-next-1').style.display = 'block';

    poblarDepartamentos('departamento_nacimiento');
    poblarDepartamentos('departamento_residencia');
    poblarCiudades('', 'lugar_nacimiento');
    poblarCiudades('', 'ciudad');

    // Listeners de selects de departamento — sin onchange inline
    document.getElementById('departamento_nacimiento').addEventListener('change', function() { poblarCiudades(this.value, 'lugar_nacimiento'); });
    document.getElementById('departamento_residencia').addEventListener('change', function() { poblarCiudades(this.value, 'ciudad'); });

    // Edad automática
    document.getElementById('fecha_nacimiento').addEventListener('change', calcularEdadField);

    // Botones "siguiente" — sin onclick inline
    document.getElementById('btn-next-1').addEventListener('click', () => nextStep(1));
    document.getElementById('btn-next-2').addEventListener('click', () => nextStep(2));
    document.getElementById('btn-next-3').addEventListener('click', () => nextStep(3));
    document.getElementById('btn-next-4').addEventListener('click', () => nextStep(4));

    // Limpiar firmas
    document.getElementById('btn-clear-sig1').addEventListener('click', () => { if (signaturePad) signaturePad.clear(); });
    document.getElementById('btn-clear-sig2').addEventListener('click', () => { if (signaturePadEntrenador) signaturePadEntrenador.clear(); });

    await loadCategorias();
    await loadEscuelas();

    setupSignaturePad();

    if (!isEditing) document.getElementById('fecha_registro').value = getTodayStr();
    if (isEditing) await loadJugador();

    document.getElementById('jugadorForm').addEventListener('submit', handleSubmit);
}

async function loadCategorias() {
    try {
        const data = await fetchAPI('/categorias');
        if (data && data.success) {
            const select = document.getElementById('categoria_id');
            data.data.forEach(cat => {
                const opt       = document.createElement('option');
                opt.value       = cat.id;
                opt.textContent = `${cat.nombre} (${cat.edad_min}-${cat.edad_max} años)`;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadEscuelas() {
    const user = getUserInfo();
    if (user.rol === 'superadmin') {
        const field = document.getElementById('escuelaField');
        field.innerHTML = `
          <label for="escuela_id" class="form-label-custom">Escuela / Sede</label>
          <select id="escuela_id" name="escuela_id" class="form-select-custom">
            <option value="">Seleccionar escuela...</option>
          </select>`;
        try {
            const data = await fetchAPI('/escuelas/');
            if (data && data.success) {
                const select = document.getElementById('escuela_id');
                data.data.forEach(esc => {
                    if (esc.activa !== false) {
                        const opt       = document.createElement('option');
                        opt.value       = esc.id;
                        opt.textContent = esc.nombre;
                        select.appendChild(opt);
                    }
                });
            }
        } catch (e) { console.error(e); }
    } else {
        document.getElementById('escuela_display').value = user.escuela_nombre || 'Sin escuela';
        document.getElementById('escuela_id').value      = user.escuela_id || '';
    }
}

async function loadJugador() {
    try {
        showLoading();
        const data = await fetchAPI(`/jugadores/api/${jugadorId}`);
        hideLoading();
        if (data && data.success) {
            const j = data.data;
            const fields = ['nombre', 'fecha_nacimiento', 'documento', 'direccion', 'telefono', 'nombre_padre',
                            'telefono_padre', 'estatura', 'peso', 'tipo_sangre', 'eps', 'cc_padre', 'nombre_madre',
                            'cc_madre', 'numero_fijo', 'fecha_registro'];
            fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = j[f] || ''; });

            // Departamentos y ciudades
            let deptoNac  = j.departamento_nacimiento;
            let ciudadNac = j.lugar_nacimiento;
            if (!deptoNac && ciudadNac) deptoNac = findDepartamentoByCiudad(ciudadNac);
            if (deptoNac) {
                document.getElementById('departamento_nacimiento').value = deptoNac;
                poblarCiudades(deptoNac, 'lugar_nacimiento');
            }
            if (ciudadNac && !Array.from(document.getElementById('lugar_nacimiento').options).some(o => o.value === ciudadNac)) {
                document.getElementById('lugar_nacimiento').innerHTML += `<option value="${ciudadNac}">${ciudadNac}</option>`;
            }
            document.getElementById('lugar_nacimiento').value = ciudadNac || '';

            let deptoRes  = j.departamento_residencia;
            let ciudadRes = j.ciudad;
            if (!deptoRes && ciudadRes) deptoRes = findDepartamentoByCiudad(ciudadRes);
            if (deptoRes) {
                document.getElementById('departamento_residencia').value = deptoRes;
                poblarCiudades(deptoRes, 'ciudad');
            }
            if (ciudadRes && !Array.from(document.getElementById('ciudad').options).some(o => o.value === ciudadRes)) {
                document.getElementById('ciudad').innerHTML += `<option value="${ciudadRes}">${ciudadRes}</option>`;
            }
            document.getElementById('ciudad').value = ciudadRes || '';

            document.getElementById('categoria_id').value = j.categoria_id || '';
            document.getElementById('escuela_id').value   = j.escuela_id   || '';
            calcularEdadField();

            // Previews
            const existingFiles = [
                { key:'foto',               preview:'fotoPreview'          },
                { key:'documento_extra2',   preview:'docExtra2Preview'     },
                { key:'documento_extra4',   preview:'docExtra4Preview'     },
                { key:'registro_civil',     preview:'registroCivilPreview' },
                { key:'documento_acudiente',preview:'docAcudientePreview'  },
                { key:'documento_extra1',   preview:'docExtra1Preview'     },
                { key:'documento_extra3',   preview:'docExtra3Preview'     }
            ];
            existingFiles.forEach(f => {
                if (j[f.key]) {
                    document.getElementById(f.preview).innerHTML = `<img src="${j[f.key]}" class="preview-img" alt="${f.key}">`;
                }
            });
            updateFileCount();

            if (j.firma_padre) {
                document.getElementById('existingSignature').style.display     = 'block';
                document.getElementById('existingSignatureImg').src            = j.firma_padre;
            }
            if (j.firma_entrenador) {
                document.getElementById('existingSignatureEntrenador').style.display  = 'block';
                document.getElementById('existingSignatureImgEntrenador').src         = j.firma_entrenador;
            }
        }
    } catch (e) {
        hideLoading();
        showToast('Error al cargar datos del jugador', 'error');
    }
}

function setupSignaturePad() {
    const canvas1    = document.getElementById('signatureCanvas');
    const container1 = document.getElementById('signatureContainer');
    const canvas2    = document.getElementById('signatureCanvasEntrenador');
    const container2 = document.getElementById('signatureContainerEntrenador');

    let prevWindowWidth = window.innerWidth;

    function resizeCanvases() {
        if (signaturePad && window.innerWidth === prevWindowWidth) return;
        prevWindowWidth = window.innerWidth;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const data1 = signaturePad            && !signaturePad.isEmpty()            ? signaturePad.toData()            : null;
        const data2 = signaturePadEntrenador  && !signaturePadEntrenador.isEmpty()  ? signaturePadEntrenador.toData()  : null;

        if (container1 && canvas1) {
            const dw1     = container1.offsetWidth ? container1.offsetWidth - 16 : canvas1.offsetWidth;
            canvas1.width = dw1 * ratio;
            canvas1.height= 200 * ratio;
            canvas1.style.width  = dw1 + 'px';
            canvas1.style.height = '200px';
            canvas1.getContext('2d').scale(ratio, ratio);
            if (signaturePad) { signaturePad.clear(); if (data1) signaturePad.fromData(data1); }
        }
        if (container2 && canvas2) {
            const dw2     = container2.offsetWidth ? container2.offsetWidth - 16 : canvas2.offsetWidth;
            canvas2.width = dw2 * ratio;
            canvas2.height= 200 * ratio;
            canvas2.style.width  = dw2 + 'px';
            canvas2.style.height = '200px';
            canvas2.getContext('2d').scale(ratio, ratio);
            if (signaturePadEntrenador) { signaturePadEntrenador.clear(); if (data2) signaturePadEntrenador.fromData(data2); }
        }
    }

    if (canvas1 && !signaturePad) {
        signaturePad = new SignaturePad(canvas1, { backgroundColor:'rgb(255,255,255)', penColor:'rgb(0,0,0)', minWidth:1, maxWidth:2.5 });
    }
    if (canvas2 && !signaturePadEntrenador) {
        signaturePadEntrenador = new SignaturePad(canvas2, { backgroundColor:'rgb(255,255,255)', penColor:'rgb(0,0,0)', minWidth:1, maxWidth:2.5 });
    }

    window.addEventListener('resize', resizeCanvases);
    setTimeout(resizeCanvases, 100);
}

function calcularEdadField() {
    const fecha   = document.getElementById('fecha_nacimiento').value;
    const display = document.getElementById('edad_display');
    if (fecha) { const edad = calcularEdad(fecha); display.value = `${edad} años`; }
    else        { display.value = ''; }
}

async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled  = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Guardando...';

    try {
        const formData = new FormData();
        const fields   = ['nombre','fecha_nacimiento','lugar_nacimiento','departamento_nacimiento','estatura','peso',
                           'tipo_sangre','eps','documento','ciudad','departamento_residencia','direccion','numero_fijo',
                           'telefono','nombre_padre','cc_padre','nombre_madre','cc_madre','telefono_padre',
                           'categoria_id','escuela_id','fecha_registro'];

        fields.forEach(field => {
            const val = document.getElementById(field)?.value;
            if (val) formData.append(field, val);
        });

        const fileFields = ['foto','registro_civil','documento_acudiente','documento_extra1','documento_extra2','documento_extra3','documento_extra4'];
        fileFields.forEach(field => {
            const hiddenUrl = document.getElementById(field + '_url');
            if (hiddenUrl && hiddenUrl.value) {
                formData.append(field + '_url', hiddenUrl.value);
            } else {
                const fileInput = document.getElementById(field);
                if (fileInput && fileInput.files && fileInput.files[0]) formData.append(field, fileInput.files[0]);
            }
        });

        if (signaturePad && !signaturePad.isEmpty())
            formData.append('firma_base64', signaturePad.toDataURL('image/png'));
        if (signaturePadEntrenador && !signaturePadEntrenador.isEmpty())
            formData.append('firma_entrenador_base64', signaturePadEntrenador.toDataURL('image/png'));

        const url      = isEditing ? `/jugadores/api/${jugadorId}` : '/jugadores/api';
        const method   = isEditing ? 'PUT' : 'POST';
        const response = await fetch(url, { method, body: formData });
        const data     = await response.json();

        if (!response.ok) throw new Error(data.message || 'Error al guardar');
        showToast(data.message || 'Jugador guardado exitosamente');
        setTimeout(() => { window.location.href = '/jugadores/page'; }, 1500);
    } catch (error) {
        showToast(error.message || 'Error al guardar', 'error');
        btn.disabled  = false;
        btn.innerHTML = `<i class="bi bi-check-circle"></i> ${isEditing ? 'Actualizar Jugador' : 'Registrar Jugador'}`;
    }
}

async function onFileSlotChange(currentSlot) {
    const fileInputIds  = ['foto','documento_extra2','documento_extra4','registro_civil','documento_acudiente','documento_extra1','documento_extra3'];
    const previewIds    = ['fotoPreview','docExtra2Preview','docExtra4Preview','registroCivilPreview','docAcudientePreview','docExtra1Preview','docExtra3Preview'];
    const fieldId       = fileInputIds[currentSlot - 1];
    const fileInput     = document.getElementById(fieldId);
    const previewEl     = document.getElementById(previewIds[currentSlot - 1]);

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const file     = fileInput.files[0];
        const formData = new FormData();
        formData.append(fieldId, file);

        if (previewEl) previewEl.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:10px auto;"></div><p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:5px;">Subiendo...</p>';

        try {
            const res  = await fetch('/jugadores/api/upload-temp', { method:'POST', body:formData });
            const data = await res.json();
            if (data.success) {
                if (file.type.startsWith('image/')) {
                    previewEl.innerHTML = `<img src="${data.url}" class="preview-img" style="max-height:80px" alt="preview">`;
                } else {
                    previewEl.innerHTML = `<div style="color:var(--success);font-size:24px;text-align:center;"><i class="bi bi-file-earmark-check-fill"></i></div>`;
                }
                let hiddenInput = document.getElementById(fieldId + '_url');
                if (!hiddenInput) {
                    hiddenInput      = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id   = fieldId + '_url';
                    hiddenInput.name = fieldId + '_url';
                    document.getElementById('jugadorForm').appendChild(hiddenInput);
                }
                hiddenInput.value = data.url;
            } else {
                previewEl.innerHTML = `<div style="color:var(--danger);font-size:12px;text-align:center;">Error: ${data.message}</div>`;
            }
        } catch (error) {
            console.error('Error in background upload:', error);
            if (previewEl) previewEl.innerHTML = `<div style="color:var(--danger);font-size:12px;text-align:center;">Error de red</div>`;
        }
    }
    updateFileCount();
}

function updateFileCount() {
    const fileInputIds = ['foto','documento_extra2','documento_extra4','registro_civil','documento_acudiente','documento_extra1','documento_extra3'];
    const previewIds   = ['fotoPreview','docExtra2Preview','docExtra4Preview','registroCivilPreview','docAcudientePreview','docExtra1Preview','docExtra3Preview'];
    let count = 0;
    fileInputIds.forEach((id, i) => {
        const input   = document.getElementById(id);
        const preview = document.getElementById(previewIds[i]);
        if ((input && input.files && input.files.length > 0) || (preview && preview.innerHTML.includes('<img'))) count++;
    });
    const badge = document.getElementById('fileCountBadge');
    if (badge) {
        badge.innerHTML   = `<i class="bi bi-info-circle me-1"></i>${count} / 7 archivos`;
        badge.className   = count >= 7 ? 'badge-custom green' : 'badge-custom gray';
        badge.style.fontSize = '11px';
    }
}

function nextStep(step) {
    const currentSection = document.getElementById('section' + step);
    if (currentSection) {
        const inputs = currentSection.querySelectorAll('[required]');
        for (let input of inputs) {
            if (!input.checkValidity()) { input.reportValidity(); return; }
        }
    }
    const nextBtn = document.getElementById('btn-next-' + step);
    if (nextBtn) nextBtn.style.display = 'none';

    const nextSection = document.getElementById('section' + (step + 1));
    if (nextSection) { nextSection.style.display = 'block'; nextSection.scrollIntoView({ behavior:'smooth', block:'center' }); }

    if (step === 4) {
        const s5 = document.getElementById('section5');
        if (s5) s5.style.display = 'block';
        const ss = document.getElementById('section-submit');
        if (ss) ss.style.removeProperty('display');
        setupSignaturePad();
    }
}

function showAllSections() {
    for (let i = 2; i <= 5; i++) {
        const sec = document.getElementById('section' + i);
        if (sec) sec.style.display = 'block';
        const btn = document.getElementById('btn-next-' + i);
        if (btn) btn.style.display = 'none';
    }
    document.getElementById('btn-next-1')?.style.setProperty('display', 'none');
    const submit = document.getElementById('section-submit');
    if (submit) submit.style.removeProperty('display');
    setupSignaturePad();
}
