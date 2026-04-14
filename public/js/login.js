/* ===================================================
   login.js — Lógica de la vista Iniciar Sesión
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const form           = document.getElementById('loginForm');
    const errorMsg       = document.getElementById('errorMsg');
    const errorText      = document.getElementById('errorText');
    const togglePassword = document.getElementById('togglePassword');

    togglePassword.addEventListener('click', () => {
        const input = document.getElementById('password');
        const icon  = togglePassword.querySelector('i');
        if (input.type === 'password') {
            input.type     = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            input.type     = 'password';
            icon.className = 'bi bi-eye';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';

        const btnLogin = document.getElementById('btnLogin');
        btnLogin.disabled   = true;
        btnLogin.innerHTML  = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Ingresando...';

        try {
            const data = await fetchAPI('/auth/login', {
                method: 'POST',
                body: {
                    email:    document.getElementById('email').value,
                    password: document.getElementById('password').value
                }
            });

            if (data && data.success) {
                window.location.href = data.redirect || '/dashboard';
            }
        } catch (error) {
            errorMsg.style.display  = 'block';
            errorText.textContent   = error.message || 'Error al iniciar sesión';
            btnLogin.disabled       = false;
            btnLogin.innerHTML      = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
        }
    });
});
