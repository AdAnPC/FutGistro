/**
 * Utility functions for the frontend
 */
const Utils = {
    /**
     * Shows a toast notification
     * @param {string} message 
     * @param {string} type - success, error, warning
     */
    showToast: (message, type = 'success') => {
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
            <span style="flex:1;font-size:13px">${Utils.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Escapes HTML to prevent XSS
     */
    escapeHtml: (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    },

    /**
     * Formats a date string to a long format
     */
    formatDate: (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Formats a date string to a short format
     */
    formatDateShort: (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    /**
     * Gets today's date string in YYYY-MM-DD
     */
    getTodayStr: () => {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Calculates age from birth date
     */
    calculateAge: (birthDate) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate + 'T00:00:00');
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    },

    /**
     * Shows a confirm dialog
     */
    confirm: (message, confirmText = 'Sí, Continuar', confirmClass = 'btn-danger-custom', iconClass = 'bi-exclamation-triangle-fill', iconColor = 'var(--danger)') => {
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
                <div style="font-size: 40px; color: ${iconColor}; margin-bottom: 12px;">
                    <i class="bi ${iconClass}"></i>
                </div>
                <h4 style="margin-bottom: 16px; font-weight: 700;">Confirmar Acción</h4>
                <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 14px;">${Utils.escapeHtml(message)}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="btn-cancelar" class="btn-secondary-custom" style="flex: 1;"><i class="bi bi-x"></i> Cancelar</button>
                    <button id="btn-confirmar" class="${confirmClass}" style="flex: 1;"><i class="bi bi-check"></i> ${Utils.escapeHtml(confirmText)}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

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
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
        });
    },

    /**
     * Shows/hides loading overlay
     */
    showLoading: () => {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    },

    hideLoading: () => {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
};
