document.addEventListener('DOMContentLoaded', function() {
    // Pega o nome do arquivo da URL atual (ex: "dashboard.html")
    const currentPage = window.location.pathname.split('/').pop();

    // Seleciona todos os links da barra lateral
    const sidebarLinks = document.querySelectorAll('#sidebar .nav-link');

    // Itera sobre cada link
    sidebarLinks.forEach(link => {
        const linkPage = link.getAttribute('href');

        // Remove a classe 'active' se ela já existir
        link.classList.remove('active');

        // Se o href do link for igual à página atual, adiciona a classe 'active'
        if (linkPage === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page'); // Adiciona para acessibilidade
        } else {
            link.removeAttribute('aria-current');
        }
    });
});
