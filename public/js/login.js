/**
 * login.js — Logic for Login view
 */

const LoginPage = {
    init: () => {
        const form = document.getElementById('loginForm');
        if (form) form.addEventListener('submit', LoginPage.handleSubmit);
        
        const toggle = document.getElementById('togglePassword');
        if (toggle) toggle.addEventListener('click', LoginPage.togglePassword);
    },

    togglePassword: () => {
        const input = document.getElementById('password');
        const icon = document.querySelector('#togglePassword i');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        const errorMsg = document.getElementById('errorMsg');
        const errorText = document.getElementById('errorText');
        const btnLogin = document.getElementById('btnLogin');

        errorMsg.style.display = 'none';
        btnLogin.disabled = true;
        btnLogin.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Ingresando...';

        try {
            const data = await API.post('/auth/login', {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            });

            if (data?.success) {
                window.location.href = data.redirect || '/dashboard';
            }
        } catch (error) {
            errorMsg.style.display = 'block';
            errorText.textContent = error.message || 'Error al iniciar sesión';
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
        }
    }
};

document.addEventListener('DOMContentLoaded', LoginPage.init);
