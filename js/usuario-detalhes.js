console.log("usuario-detalhes.js script loaded");

import { onAuth, getCurrentUser } from './auth-manager.js';
import { getUser, getContractsForUser, getKpisForUser, getChartDataForUser } from './firestore-service.js';
import { updateUIVisibility } from './ui-visibility.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';

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
            displayCharts(chartData);
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

function displayKpis(kpis) {
    const kpiContainer = document.getElementById('kpi-container');
    kpiContainer.innerHTML = `
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">Total de Contratos</h5>
                    <p class="card-text fs-4">${kpis.totalContracts}</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">Valor Total</h5>
                    <p class="card-text fs-4">R$ ${kpis.totalValue}</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">Contratos Ativos</h5>
                    <p class="card-text fs-4">${kpis.activeContracts}</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">Ticket Médio</h5>
                    <p class="card-text fs-4">R$ ${kpis.averageTicket}</p>
                </div>
            </div>
        </div>
    `;
}

function displayCharts(chartData) {
    // Production Chart
    const productionCtx = document.getElementById('productionChart').getContext('2d');
    new Chart(productionCtx, {
        type: 'line',
        data: {
            labels: chartData.production.labels,
            datasets: [{
                label: 'Produção Mensal',
                data: chartData.production.values,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Status Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: chartData.status.labels,
            datasets: [{
                label: 'Status dos Contratos',
                data: chartData.status.values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
            }]
        },
        options: {
            responsive: true,
        }
    });
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
