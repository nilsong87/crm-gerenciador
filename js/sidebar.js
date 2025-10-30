import { onAuth, getCurrentUser } from './auth-manager.js';

function renderSidebar(userRole) {
    const sidebarNav = document.querySelector('#sidebar .nav');
    if (!sidebarNav) {
        console.error('Sidebar navigation element not found.');
        return;
    }

    sidebarNav.innerHTML = ''; // Clear existing sidebar content

    const navItems = [
        { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard', roles: ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial', 'operacional'] },
        { href: 'relatorios.html', icon: 'fas fa-file-alt', text: 'Relatórios', roles: ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial', 'operacional'] },
        { href: 'usuarios.html', icon: 'fas fa-users', text: 'Usuários', roles: ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial'] },
        { href: 'metas.html', icon: 'fas fa-bullseye', text: 'Metas', roles: ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial'] },
        { href: 'logs.html', icon: 'fas fa-clipboard-list', text: 'Logs de Auditoria', roles: ['diretoria'] },
    ];

    const currentPage = window.location.pathname.split('/').pop();

    navItems.forEach(item => {
        if (item.roles.includes(userRole)) {
            const listItem = document.createElement('li');
            listItem.className = 'nav-item';

            const link = document.createElement('a');
            link.className = 'nav-link';
            link.href = item.href;
            link.innerHTML = `<i class="${item.icon}"></i> ${item.text}`;

            if (item.href === currentPage) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }

            listItem.appendChild(link);
            sidebarNav.appendChild(listItem);
        }
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    const user = await onAuth();
    if (user) {
        renderSidebar(user.role);
    } else {
        // Handle case where user is not authenticated, maybe redirect to login
        // This should ideally be handled by enforceRoleAccess on each page
    }
});