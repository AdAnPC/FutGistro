/* ===================================================
   seleccionar-escuela.js — Lógica de la vista Crear tu Escuela
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('escuelaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorMsg  = document.getElementById('errorMsg');
        const errorText = document.getElementById('errorText');
        errorMsg.style.display = 'none';

        const btn = document.getElementById('btnSelect');
        btn.disabled  = true;
        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Creando...';

        try {
            const data = await fetchAPI('/auth/seleccionar-escuela', {
                method: 'POST',
                body: { escuela_nombre: document.getElementById('escuela_nombre').value }
            });

            if (data && data.success) {
                showToast('✅ Escuela creada');
                setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 1000);
            }
        } catch (error) {
            errorMsg.style.display = 'block';
            errorText.textContent  = error.message || 'Error';
            btn.disabled           = false;
            btn.innerHTML          = '<i class="bi bi-check-circle"></i> Crear Escuela y Continuar';
        }
    });
});
