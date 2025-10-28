import { enforceRoleAccess } from './auth-manager.js';
const allowedRoles = ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial'];
enforceRoleAccess(allowedRoles);

import { getUsers } from './firestore-service.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { getCurrentUser } from './auth-manager.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';

let usersDataTable;
let editUserModal;

// Called from usuarios.html after auth state is confirmed
export function initializeUsersPage() {
    try {
        const user = getCurrentUser();
        console.log("Initializing users page for role:", user.role);
        editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
        initializeDataTable();
        loadUsers();

        document.getElementById('save-user-button').addEventListener('click', saveUserRole);
    } catch (error) {
        handleError(error, 'Initialize Users Page');
    }
}

function initializeDataTable() {
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable().destroy();
    }

    usersDataTable = $('#usersTable').DataTable({
        columns: [
            { title: "Nome" },
            { title: "Email" },
            { title: "Perfil" },
            { title: "Ações", orderable: false, searchable: false }
        ],
        responsive: true,
        language: {
            url: 'js/i18n/pt-BR.json',
            emptyTable: "Nenhum usuário encontrado."
        }
    });

    // Add event listener for edit buttons
    $('#usersTable tbody').on('click', '.edit-btn', function () {
        try {
            const row = usersDataTable.row($(this).parents('tr')).data();
            const userId = $(this).data('id');
            openEditModal(userId, row[1], row[2]); // email, role
        } catch (error) {
            handleError(error, 'Open Edit Modal');
        }
    });
}

async function loadUsers() {
    showLoadingIndicator();
    try {
        const users = await getUsers();
        if (!users) return;

        const currentUser = getCurrentUser();

        const canEdit = (targetUser) => {
            if (!currentUser || !targetUser) return false;
            const editorRole = currentUser.role;

            if (editorRole === 'diretoria' || editorRole === 'superintendencia') {
                return true;
            }
            if (editorRole === 'gerente_regional' && currentUser.state === targetUser.state) {
                return true;
            }
            if (editorRole === 'comercial' && currentUser.city === targetUser.city) {
                return true;
            }
            if (currentUser.uid === targetUser.uid) {
                return true;
            }
            return false;
        };

        const tableData = users.map(user => {
            const editButton = canEdit(user)
                ? `<button class="btn btn-sm btn-primary edit-btn" data-id="${user.uid}">Editar</button>`
                : '';

            return [
                `<a href="usuario-detalhes.html?uid=${user.uid}">${user.nome || 'Não informado'}</a>`,
                user.email,
                user.role || 'N/D',
                editButton
            ];
        });

        usersDataTable.clear().rows.add(tableData).draw();
    } catch (error) {
        handleError(error, 'Load Users');
    } finally {
        hideLoadingIndicator();
    }
}

function openEditModal(userId, email, currentRole) {
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-email').value = email;
    document.getElementById('edit-user-role').value = currentRole;
    editUserModal.show();
}

async function saveUserRole() {
    showLoadingIndicator();
    try {
        const userId = document.getElementById('edit-user-id').value;
        const newRole = document.getElementById('edit-user-role').value;

        if (!userId || !newRole) {
            alert('Erro: ID do usuário ou novo perfil não encontrado.');
            return;
        }

        const saveButton = document.getElementById('save-user-button');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        
        // We need a cloud function to update user claims from the client side securely
        const functions = getFunctions();
        const setUserRole = httpsCallable(functions, 'setUserRole');
        await setUserRole({ uid: userId, role: newRole });

        alert('Perfil do usuário atualizado com sucesso!');
        editUserModal.hide();
        await loadUsers(); // Refresh the table
    } catch (error) {
        handleError(error, 'Save User Role');
    } finally {
        const saveButton = document.getElementById('save-user-button');
        saveButton.disabled = false;
        saveButton.innerHTML = 'Salvar Alterações';
        hideLoadingIndicator();
    }
}
