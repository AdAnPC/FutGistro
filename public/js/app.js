// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast-custom ${type}`;
    toast.innerHTML = `
    <i class="bi ${icons[type] || icons.success}" style="font-size:20px"></i>
    <span style="flex:1;font-size:13px">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px">&times;</button>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============ FETCH HELPER ============
async function fetchAPI(url, options = {}) {
    try {
        const defaultOptions = {
            headers: {}
        };

        // Only set Content-Type for non-FormData
        if (!(options.body instanceof FormData)) {
            defaultOptions.headers['Content-Type'] = 'application/json';
            if (options.body && typeof options.body === 'object') {
                options.body = JSON.stringify(options.body);
            }
        }

        const response = await fetch(url, { ...defaultOptions, ...options });

        // Handle redirects (login expired)
        if (response.redirected) {
            window.location.href = response.url;
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en la solicitud');
        }

        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            showToast('Error de conexión con el servidor', 'error');
        }
        throw error;
    }
}

// ============ LOADING ============
function showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ============ CONFIRM DIALOG ============
function confirmAction(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, opacity: 0, transition: 'opacity 0.2s ease'
        });

        const modal = document.createElement('div');
        modal.className = 'data-card';
        Object.assign(modal.style, {
            backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)',
            width: '90%', maxWidth: '400px', textAlign: 'center',
            boxShadow: 'var(--shadow-xl)', transform: 'translateY(20px)', transition: 'transform 0.2s ease'
        });

        modal.innerHTML = `
            <div style="font-size: 40px; color: var(--danger); margin-bottom: 12px;">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h4 style="margin-bottom: 16px; font-weight: 700;">Confirmar Acción</h4>
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 14px;">${escapeHtml(message)}</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="btn-cancelar" class="btn-secondary-custom" style="flex: 1;"><i class="bi bi-x"></i> Cancelar</button>
                <button id="btn-confirmar" class="btn-danger-custom" style="flex: 1;"><i class="bi bi-check"></i> Sí, eliminar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = 1;
            modal.style.transform = 'translateY(0)';
        });

        const cleanup = (result) => {
            overlay.style.opacity = 0;
            modal.style.transform = 'translateY(10px)';
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(result);
            }, 200);
        };

        modal.querySelector('#btn-cancelar').addEventListener('click', () => cleanup(false));
        modal.querySelector('#btn-confirmar').addEventListener('click', () => cleanup(true));
        
        // Clic outside cancels
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });
    });
}

// ============ DATE FORMATTING ============
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateShort(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// ============ AGE CALCULATION ============
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
}

// ============ XSS PROTECTION ============
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ============ USER INFO ============
async function loadUserInfo() {
    if (window.__USER__) return window.__USER__;
    try {
        const res = await fetch('/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                window.__USER__ = data.data;
                // Redirect if user needs to select school
                if (data.data.necesita_escuela && !window.location.pathname.includes('/seleccionar-escuela')) {
                    window.location.href = '/auth/seleccionar-escuela';
                    return data.data;
                }
                return data.data;
            }
        }
    } catch (e) { }
    return { nombre: 'Usuario', rol: 'entrenador' };
}

function getUserInfo() {
    return window.__USER__ || { nombre: 'Usuario', rol: 'entrenador' };
}

// ============ SIDEBAR ============
function initSidebar() {
    const toggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Active link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.startsWith(href)) {
            link.classList.add('active');
        }
    });
}

// ============ SIDEBAR TEMPLATE ============
function renderSidebar(userName, userRole) {
    const rolLabels = { superadmin: 'Super Admin', administrador: 'Administrador', entrenador: 'Entrenador' };
    const rolLabel = rolLabels[userRole] || userRole || 'entrenador';
    return `
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon" style="width: 50px; height: 50px; background: transparent; display: flex; align-items: center; justify-content: center;">
          ${window.__USER__ && window.__USER__.escuela_logo ? `<img src="${window.__USER__.escuela_logo}" alt="Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;">` : `<img src="/icons/fut.jpeg" alt="futGistro" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;">`}
        </div>
        <div class="sidebar-brand-text">
          <h5>${window.__USER__ && window.__USER__.escuela_nombre ? escapeHtml(window.__USER__.escuela_nombre) : 'futGistro'}</h5>
          <small>Sistema de Gestión</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-label">Principal</div>
        <a href="/dashboard" class="sidebar-link" id="nav-dashboard">
          <i class="bi bi-grid-1x2-fill"></i> Dashboard
        </a>
        <a href="/escuelas/mi-escuela/page" class="sidebar-link" id="nav-mi-escuela">
          <i class="bi bi-building"></i> Mi Escuela
        </a>
        <a href="/jugadores/page" class="sidebar-link" id="nav-jugadores">
          <i class="bi bi-people-fill"></i> Jugadores
        </a>
        <a href="/categorias/page" class="sidebar-link" id="nav-categorias">
          <i class="bi bi-tags-fill"></i> Categorías
        </a>
        <a href="/asistencia/page" class="sidebar-link" id="nav-asistencia">
          <i class="bi bi-calendar-check-fill"></i> Asistencia
        </a>
        <a href="/pagos/page" class="sidebar-link" id="nav-pagos">
          <i class="bi bi-cash-stack"></i> Pagos
        </a>
        ${userRole === 'superadmin' ? `
        <div class="sidebar-label">Super Admin</div>
        <a href="/escuelas/page" class="sidebar-link" id="nav-escuelas">
          <i class="bi bi-building-fill"></i> Escuelas / Sedes
        </a>
        <a href="/auth/usuarios/page" class="sidebar-link" id="nav-usuarios">
          <i class="bi bi-people-fill"></i> Gestionar Usuarios
        </a>
        <a href="/auth/registro" class="sidebar-link" id="nav-registro">
          <i class="bi bi-person-plus-fill"></i> Crear Usuario
        </a>
        ` : userRole === 'administrador' ? `
        <div class="sidebar-label">Administración</div>
        <a href="/auth/registro" class="sidebar-link" id="nav-registro">
          <i class="bi bi-person-plus-fill"></i> Crear Usuario
        </a>
        ` : ''}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${(userName || 'U').charAt(0).toUpperCase()}</div>
        <div class="sidebar-user-info">
          <div class="name">${escapeHtml(userName || 'Usuario')}</div>
          <div class="role">${escapeHtml(rolLabel)}</div>
          ${window.__USER__ && window.__USER__.escuela_nombre ? `<div class="role" style="font-size:10px;color:var(--primary-light)"><i class="bi bi-building"></i> ${escapeHtml(window.__USER__.escuela_nombre)}</div>` : ''}
        </div>
        <a href="/auth/logout" class="btn-icon" title="Cerrar sesión" id="btn-logout">
          <i class="bi bi-box-arrow-right"></i>
        </a>
      </div>
    </aside>
  `;
}

// ============ FILE PREVIEW ============
function setupFileUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<img src="${ev.target.result}" class="preview-img" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Initialize sidebar and PWA on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    
    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('PWA Service Worker registrado', reg.scope))
        .catch(err => console.log('Error registrando Service Worker:', err));
    }
});
