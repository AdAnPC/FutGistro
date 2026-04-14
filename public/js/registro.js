/* ===================================================
   registro.js — Lógica de la vista Registrar Usuario
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('registroForm');
    const errorMsg  = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    const rolSelect = document.getElementById('rol');

    // Toggle campo escuela según rol
    rolSelect.addEventListener('change', () => {
        const group    = document.getElementById('escuelaGroup');
        const escInput = document.getElementById('escuela_nombre');
        if (rolSelect.value === 'superadmin') {
            group.style.display = 'none';
            escInput.removeAttribute('required');
        } else {
            group.style.display = '';
            escInput.setAttribute('required', 'required');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';

        const btn = document.getElementById('btnRegistro');
        btn.disabled  = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Creando...';

        try {
            const data = await fetchAPI('/auth/registro', {
                method: 'POST',
                body: {
                    nombre:         document.getElementById('nombre').value,
                    email:          document.getElementById('email').value,
                    password:       document.getElementById('password').value,
                    rol:            document.getElementById('rol').value,
                    escuela_nombre: document.getElementById('escuela_nombre').value || null
                }
            });

            if (data && data.success) {
                showToast('Usuario y escuela creados exitosamente');
                setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
            }
        } catch (error) {
            errorMsg.style.display = 'block';
            errorText.textContent  = error.message || 'Error al crear usuario';
            btn.disabled           = false;
            btn.innerHTML          = '<i class="bi bi-person-plus"></i> Crear Usuario';
        }
    });
});
