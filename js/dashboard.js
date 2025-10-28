import { getContracts, getKpis, getChartData, getAllContractsForFiltering, getPromoterRanking } from './firestore-service.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { getCurrentUser } from './auth-manager.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';
import { displayKpis, displayDashboardCharts, getStatusColor } from './ui-components.js';

const functions = getFunctions();
const syncWorkbankData = httpsCallable(functions, 'syncWorkbankData');
const syncInternalCrmData = httpsCallable(functions, 'syncInternalCrmData');

let datepicker;

document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log("Dashboard script loaded and executing.");

        datepicker = new Litepicker({
            element: document.getElementById('datepicker'),
            singleMode: false,
            format: 'DD/MM/YYYY',
            lang: 'pt-BR'
        });

        const filterButton = document.getElementById('filter-button');
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                refreshDashboard();
            });
        }
        const clearFiltersButton = document.getElementById('clear-filters-button');
        if (clearFiltersButton) {
            clearFiltersButton.addEventListener('click', () => {
                document.getElementById('status-filter').value = '';
                document.getElementById('promotora-filter').value = '';
                document.getElementById('regiao-filter').value = '';
                document.getElementById('cpf-contrato-filter').value = '';
                document.getElementById('tabela-filter').value = '';
                document.getElementById('empresa-filter').value = '';
                document.getElementById('market-share-filter').value = 'promotora';
                datepicker.clearSelection();
                refreshDashboard();
            });
        }

        const marketShareFilter = document.getElementById('market-share-filter');
        if (marketShareFilter) {
            marketShareFilter.addEventListener('change', () => {
                refreshDashboard();
            });
        }

        // --- Event Listeners for Admin Sync Buttons ---
        const syncWorkbankBtn = document.getElementById('sync-workbank-button');
        if (syncWorkbankBtn) {
            syncWorkbankBtn.addEventListener('click', () => handleSync(syncWorkbankData, 'Workbank CRM', syncWorkbankBtn));
        }

        const syncInternalCrmBtn = document.getElementById('sync-internal-crm-button');
        if (syncInternalCrmBtn) {
            syncInternalCrmBtn.addEventListener('click', () => handleSync(syncInternalCrmData, 'CRM Interno', syncInternalCrmBtn));
        }
    } catch (error) {
        handleError(error, 'Dashboard DOMContentLoaded');
    }
});

async function handleSync(syncFunction, sourceName, button) {
    const statusDiv = document.getElementById('sync-status');
    if (!statusDiv) return;

    statusDiv.innerHTML = `<div class="alert alert-info">Sincronizando dados do ${sourceName}...</div>`;
    button.disabled = true;
    showLoadingIndicator();

    try {
        const result = await syncFunction();
        statusDiv.innerHTML = `<div class="alert alert-success">${result.data.message}</div>`;
        // Optionally, refresh dashboard data after sync
        setTimeout(() => refreshDashboard(), 1000);
    } catch (error) {
        handleError(error, `Sync ${sourceName}`);
        statusDiv.innerHTML = `<div class="alert alert-danger">Erro ao sincronizar ${sourceName}.</div>`;
    } finally {
        button.disabled = false;
        hideLoadingIndicator();
    }
}

export async function initializeDashboard() {
    showLoadingIndicator();
    try {
        const user = getCurrentUser();
        console.log("Initializing dashboard for role:", user.role);
        await populateFilterOptions();
        await refreshDashboard();
    } catch (error) {
        handleError(error, 'Dashboard Initialization');
    } finally {
        hideLoadingIndicator();
    }
}

function getFilters() {
    const status = document.getElementById('status-filter').value;
    const promotora = document.getElementById('promotora-filter').value;
    const regiao = document.getElementById('regiao-filter').value;
    const cpfContrato = document.getElementById('cpf-contrato-filter').value;
    const tabela = document.getElementById('tabela-filter').value;
    const tipoEmpresa = document.getElementById('empresa-filter').value;
    const startDate = datepicker.getStartDate()?.toJSDate();
    const endDate = datepicker.getEndDate()?.toJSDate();
    const marketShareDimension = document.getElementById('market-share-filter').value;

    return { status, promotora, regiao, cpfContrato, tabela, tipoEmpresa, startDate, endDate, marketShareDimension };
}

async function populateFilterOptions() {
    try {
        const contracts = await getAllContractsForFiltering();
        
        const promotoraFilter = document.getElementById('promotora-filter');
        const regiaoFilter = document.getElementById('regiao-filter');
        const tabelaFilter = document.getElementById('tabela-filter');
        const empresaFilter = document.getElementById('empresa-filter');

        const promotoras = [...new Set(contracts.map(c => c.promotora).filter(Boolean))].sort();
        const regioes = [...new Set(contracts.map(c => c.regiao).filter(Boolean))].sort();
        const tabelas = [...new Set(contracts.map(c => c.tabela).filter(Boolean))].sort();
        const empresas = [...new Set(contracts.map(c => c.tipoEmpresa).filter(Boolean))].sort();

        // Clear existing options except the first one ("Todas")
        promotoraFilter.innerHTML = '<option value="">Todas</option>';
        regiaoFilter.innerHTML = '<option value="">Todas</option>';
        tabelaFilter.innerHTML = '<option value="">Todas</option>';
        empresaFilter.innerHTML = '<option value="">Todas</option>';

        promotoras.forEach(p => {
            const option = new Option(p, p);
            promotoraFilter.add(option);
        });

        regioes.forEach(r => {
            const option = new Option(r, r);
            regiaoFilter.add(option);
        });

        tabelas.forEach(t => {
            const option = new Option(t, t);
            tabelaFilter.add(option);
        });

        empresas.forEach(e => {
            const option = new Option(e, e);
            empresaFilter.add(option);
        });
    } catch (error) {
        handleError(error, 'Populate Filter Options');
    }
}

export async function refreshDashboard() {
    showLoadingIndicator();
    try {
        const user = getCurrentUser();
        const filters = getFilters();
        console.log("Refreshing dashboard with role:", user.role, "and filters:", filters);

        // Run all data refreshes in parallel
        await Promise.all([
            populateKpis(filters),
            populateContractsTable(filters),
            initializeCharts(filters, filters.marketShareDimension),
            populatePromoterRanking(filters)
        ]);
    } catch (error) {
        handleError(error, 'Refresh Dashboard');
    } finally {
        hideLoadingIndicator();
    }
}

async function populatePromoterRanking(filters) {
    try {
        const rankingList = document.getElementById('promoter-ranking-list');
        if (!rankingList) return;

        const rankingData = await getPromoterRanking(filters);

        rankingList.innerHTML = ''; // Clear previous ranking

        if (rankingData.length === 0) {
            rankingList.innerHTML = '<li class="list-group-item">Nenhum dado para exibir.</li>';
            return;
        }

        rankingData.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            const rank = index + 1;
            let medal = '';
            if (rank === 1) medal = '<i class="fas fa-medal text-warning"></i>';
            else if (rank === 2) medal = '<i class="fas fa-medal text-secondary"></i>';
            else if (rank === 3) medal = '<i class="fas fa-medal" style="color: #cd7f32;"></i>';

            li.innerHTML = `
                <span>${medal} ${item.promoter}</span>
                <span class="badge bg-primary rounded-pill">R$ ${item.totalValue.toFixed(2)}</span>
            `;
            rankingList.appendChild(li);
        });
    } catch (error) {
        handleError(error, 'Populate Promoter Ranking');
    }
}

async function populateKpis(filters) {
    try {
        const kpis = await getKpis(filters);
        displayKpis(kpis);
    } catch (error) {
        handleError(error, 'Populate KPIs');
    }
}


async function populateContractsTable(filters) {
    try {
        const contracts = await getContracts(filters);
        const tableData = contracts.map(c => {
            const contractDate = c.date?.toDate ? c.date.toDate().toLocaleDateString('pt-BR') : 'N/A';
            return [
                c.id,
                c.clientName || 'N/A',
                c.clientCpf || 'N/A',
                c.status || 'N/A', // Export raw status text
                contractDate,
                c.value?.toFixed(2) || '0.00'
            ];
        });

        if ($.fn.DataTable.isDataTable('#contractsTable')) {
            $('#contractsTable').DataTable().destroy();
        }

        $('#contractsTable').DataTable({
            data: tableData,
            columns: [
                { title: "Contrato" },
                { title: "Cliente" },
                { title: "CPF" },
                { 
                    title: "Status",
                    // Render badge for display, but use raw text for filtering/exporting
                    render: function(data, type, row) {
                        return `<span class="badge bg-${getStatusColor(data)}">${data || 'N/A'}</span>`;
                    }
                },
                { title: "Data" },
                { title: "Valor" }
            ],
            responsive: true,
            language: {
                url: 'js/i18n/pt-BR.json',
            },
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn-success'
                },
                {
                    extend: 'csvHtml5',
                    text: '<i class="fas fa-file-csv"></i> CSV',
                    className: 'btn-primary'
                },
                {
                    extend: 'pdfHtml5',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn-danger'
                }
            ]
        });
    } catch (error) {
        handleError(error, 'Populate Contracts Table');
    }
}

async function initializeCharts(filters, marketShareDimension) {
    try {
        const chartData = await getChartData(filters, marketShareDimension);
        displayDashboardCharts(chartData, marketShareDimension);
    } catch (error) {
        handleError(error, 'Initialize Charts');
    }
}