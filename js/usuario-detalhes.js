console.log("usuario-detalhes.js script loaded");

import { onAuth, getCurrentUser, enforceRoleAccess } from './auth-manager.js';
import { getUser, getContractsForUser, getKpisForUser, getChartDataForUser } from './firestore-service.js';
import { updateUIVisibility } from './ui-visibility.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';
import { displayKpis, displayUserDetailsCharts } from './ui-components.js';

enforceRoleAccess(['diretoria', 'superintendencia', 'gerencia_regional', 'comercial']);

document.addEventListener('DOMContentLoaded', () => {
    onAuth((user) => {
        if (user) {
            updateUIVisibility(user.role);
            const urlParams = new URLSearchParams(window.location.search);
            const selectedUserId = urlParams.get('uid');

            if (selectedUserId) {
                initializeUserDetailsPage(selectedUserId);
            } else {
                handleError(new Error('No user UID found in URL'), 'User Details Page');
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

async function initializeUserDetailsPage(selectedUserId) {
    showLoadingIndicator();
    try {
        // 1. Fetch user data
        const userData = await getUser(selectedUserId);
        if (userData) {
            displayUserInfo(userData);
        }

        // 2. Fetch user's contracts (respecting logged-in user's permissions)
        const contracts = await getContractsForUser(selectedUserId);
        if (contracts) {
            displayContractsTable(contracts);

            // 3. Get and display KPIs
            const kpis = getKpisForUser(contracts);
            displayKpis(kpis);

            // 4. Get and display charts
            const chartData = getChartDataForUser(contracts);
            displayUserDetailsCharts(chartData);
        }
    } catch (error) {
        handleError(error, 'Initialize User Details Page');
    } finally {
        hideLoadingIndicator();
    }
}

function displayUserInfo(userData) {
    document.getElementById('user-name').textContent = userData.nome || 'Não informado';
    document.getElementById('user-email').textContent = userData.email || '-';
    document.getElementById('user-role').textContent = userData.role || 'N/D';
    document.getElementById('user-city').textContent = userData.city || 'Não informada';
    document.getElementById('user-state').textContent = userData.state || 'Não informado';
}

function displayContractsTable(contracts) {
    if ($.fn.DataTable.isDataTable('#contractsTable')) {
        $('#contractsTable').DataTable().destroy();
    }

    $('#contractsTable').DataTable({
        data: contracts,
        columns: [
            { title: "Data", data: 'date', render: data => data ? new Date(data.seconds * 1000).toLocaleDateString() : '-' },
            { title: "Cliente", data: 'clientName' },
            { title: "Valor", data: 'value', render: data => `R$ ${data.toFixed(2)}` },
            { title: "Status", data: 'status' },
            { title: "Promotora", data: 'promotora' }
        ],
        responsive: true,
        language: {
            url: 'js/i18n/pt-BR.json',
            emptyTable: "Nenhum contrato encontrado para este usuário."
        }
    });
}
