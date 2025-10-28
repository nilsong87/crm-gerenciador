export function updateUIVisibility(role) {
    const usersLink = document.querySelector('a[href="usuarios.html"]');
    const goalsLink = document.querySelector('a[href="metas.html"]');
    const adminSection = document.getElementById('admin-section');

    // Default to hidden
    if(usersLink) usersLink.parentElement.style.display = 'none';
    if(goalsLink) goalsLink.parentElement.style.display = 'block'; // Should be visible now
    if(adminSection) adminSection.style.display = 'none';

    // Show based on role
    const allowedRoles = ['diretoria', 'superintendencia', 'gerente_regional', 'comercial'];
    if (allowedRoles.includes(role)) {
        if(usersLink) usersLink.parentElement.style.display = 'block';
    }

    if (role === 'diretoria' || role === 'superintendencia') {
        if(adminSection) adminSection.style.display = 'block';
    }
    
    // Handle visibility for the 'Add Goal' button on the metas.html page
    const addGoalButton = document.getElementById('add-goal-button');
    if (addGoalButton) {
        if (role !== 'operacional') {
            addGoalButton.style.display = 'block';
        } else {
            addGoalButton.style.display = 'none';
        }
    }
}