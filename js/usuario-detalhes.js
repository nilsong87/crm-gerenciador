import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getUserData, getContractsForUser, getKpisForUser } from './firestore-service.js';

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Get selected user's UID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const selectedUserId = urlParams.get('uid');

            if (selectedUserId) {
                initializeUserDetailsPage(user, selectedUserId);
            } else {
                console.error('No user UID found in URL');
                // Redirect or show error
            }
        } else {
            // User is signed out, redirect to login
            window.location.href = 'index.html';
        }
    });
});

async function initializeUserDetailsPage(loggedInUser, selectedUserId) {
    // 1. Fetch user data
    const userData = await getUserData(selectedUserId);
    if (userData) {
        displayUserInfo(userData);
    }

    // 2. Fetch user's contracts (respecting logged-in user's permissions)
    const contracts = await getContractsForUser(loggedInUser.uid, loggedInUser.customClaims.role, selectedUserId);
    if (contracts) {
        displayContractsTable(contracts);
    }

    // 3. Fetch and display KPIs
    const kpis = await getKpisForUser(contracts);
    if (kpis) {
        displayKpis(kpis);
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
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json',
            emptyTable: "Nenhum contrato encontrado para este usuário."
        }
    });
}
