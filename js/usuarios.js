import { getUsers } from './firestore-service.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

let usersDataTable;
let editUserModal;

// Called from usuarios.html after auth state is confirmed
export function initializeUsersPage(uid, role) {
    console.log("Initializing users page for role:", role);
    editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    initializeDataTable();
    loadUsers();

    document.getElementById('save-user-button').addEventListener('click', saveUserRole);
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
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json',
            emptyTable: "Nenhum usuário encontrado."
        }
    });

    // Add event listener for edit buttons
    $('#usersTable tbody').on('click', '.edit-btn', function () {
        const row = usersDataTable.row($(this).parents('tr')).data();
        const userId = $(this).data('id');
        openEditModal(userId, row[1], row[2]); // email, role
    });
}

async function loadUsers() {
    const users = await getUsers();
    console.log("Dados dos usuários recebidos do Firestore:", users); // Adicione esta linha
    if (!users) return;

    const tableData = users.map(user => {
        return [
            user.nome || 'Não informado',
            user.email,
            user.role || 'N/D',
            `<button class="btn btn-sm btn-primary edit-btn" data-id="${user.uid}">Editar</button>`
        ];
    });

    usersDataTable.clear().rows.add(tableData).draw();
}

function openEditModal(userId, email, currentRole) {
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-email').value = email;
    document.getElementById('edit-user-role').value = currentRole;
    editUserModal.show();
}

async function saveUserRole() {
    const userId = document.getElementById('edit-user-id').value;
    const newRole = document.getElementById('edit-user-role').value;

    if (!userId || !newRole) {
        alert('Erro: ID do usuário ou novo perfil não encontrado.');
        return;
    }

    const saveButton = document.getElementById('save-user-button');
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

    try {
        // We need a cloud function to update user claims from the client side securely
        const functions = getFunctions();
        const setUserRole = httpsCallable(functions, 'setUserRole');
        await setUserRole({ uid: userId, role: newRole });

        alert('Perfil do usuário atualizado com sucesso!');
        editUserModal.hide();
        loadUsers(); // Refresh the table
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        alert(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Salvar Alterações';
    }
}
