// Funções de componentes de UI reutilizáveis

// Certifique-se de que Chart.js esteja disponível globalmente ou importe-o
// import Chart from 'chart.js/auto';

/**
 * Exibe os cartões de KPI (Key Performance Indicator).
 * @param {object} kpis - Objeto contendo os dados dos KPIs.
 */
export function displayKpis(kpis) {
    const kpiContainer = document.getElementById('kpi-container');
    const template = document.getElementById('kpi-card-template');

    if (!kpiContainer || !template) return;

    kpiContainer.innerHTML = ''; // Limpa o container

    const kpiData = [
        { title: 'Contratos Ativos', value: kpis.activeContracts ?? 0, icon: 'fa-file-signature', color: 'bg-primary' },
        { title: 'Ticket Médio', value: `R$ ${kpis.averageTicket?.toFixed(2) ?? '0.00'}`, icon: 'fa-dollar-sign', color: 'bg-success' },
        { title: 'Valor Total', value: `R$ ${kpis.totalValue?.toFixed(2) ?? '0.00'}`, icon: 'fa-wallet', color: 'bg-info' },
        { title: 'Cancelamentos', value: (kpis.totalContracts ?? 0) - (kpis.activeContracts ?? 0), icon: 'fa-times-circle', color: 'bg-warning' }
    ];

    kpiData.forEach(kpi => {
        const card = template.content.cloneNode(true);
        const cardElement = card.querySelector('.card');
        const titleElement = card.querySelector('.card-title span');
        const valueElement = card.querySelector('.card-text');
        const iconElement = card.querySelector('.card-title i');

        cardElement.classList.add(kpi.color);
        titleElement.textContent = kpi.title;
        valueElement.textContent = kpi.value;
        iconElement.classList.add(kpi.icon);

        kpiContainer.appendChild(card);
    });
}

/**
 * Retorna a cor do bootstrap baseada no status do contrato.
 * @param {string} status - O status do contrato.
 * @returns {string} A classe de cor do Bootstrap.
 */
export function getStatusColor(status) {
    switch (status) {
        case 'pago': return 'success';
        case 'pendente': return 'warning';
        case 'cancelado': return 'danger';
        default: return 'secondary';
    }
}

/**
 * Retorna a cor hexadecimal para o gráfico de status.
 * @param {string} status - O status do contrato.
 * @returns {string} A cor em hexadecimal.
 */
export function getStatusChartColors(status) {
    switch (status) {
        case 'pago': return '#198754';
        case 'pendente': return '#ffc107';
        case 'cancelado': return '#dc3545';
        default: return '#6c757d';
    }
}

// Instâncias dos gráficos para que possam ser destruídas e recriadas
let productionChartInstance = null;
let marketShareChartInstance = null;
let statusChartInstance = null;

/**
 * Exibe os gráficos para a página de dashboard.
 * @param {object} chartData - Dados para os gráficos.
 * @param {string} marketShareDimension - A dimensão para o gráfico de market share.
 */
export function displayDashboardCharts(chartData, marketShareDimension) {
    if (productionChartInstance) productionChartInstance.destroy();
    if (marketShareChartInstance) marketShareChartInstance.destroy();
    if (statusChartInstance) statusChartInstance.destroy();

    const ctxProd = document.getElementById('productionChart');
    if (ctxProd) {
        productionChartInstance = new Chart(ctxProd, {
            type: 'bar',
            data: {
                labels: chartData.production.labels,
                datasets: [{
                    label: 'Produção Mensal',
                    data: chartData.production.values,
                    backgroundColor: 'rgba(41, 98, 255, 0.7)',
                    borderColor: 'rgba(41, 98, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });
    }

    const ctxMarket = document.getElementById('marketShareChart');
    if (ctxMarket) {
        const dimensionText = $(`#market-share-filter option[value='${marketShareDimension}']`).text();
        marketShareChartInstance = new Chart(ctxMarket, {
            type: 'pie',
            data: {
                labels: chartData.marketShare.labels,
                datasets: [{
                    label: `Market Share ${dimensionText}`,
                    data: chartData.marketShare.values,
                    backgroundColor: ['#2962ff', '#00c853', '#ffab00', '#d500f9', '#ff3d00', '#00b8d4', '#6200ea'],
                    borderWidth: 1
                }]
            },
            options: { plugins: { legend: { position: 'bottom' } } }
        });
    }

    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) {
        statusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: chartData.status.labels,
                datasets: [{
                    label: 'Status dos Contratos',
                    data: chartData.status.values,
                    backgroundColor: chartData.status.labels.map(label => getStatusChartColors(label)),
                    borderWidth: 1
                }]
            },
            options: { plugins: { legend: { position: 'bottom' } } }
        });
    }
}

/**
 * Exibe os gráficos para a página de detalhes do usuário.
 * @param {object} chartData - Dados para os gráficos.
 */
export function displayUserDetailsCharts(chartData) {
    const productionCtx = document.getElementById('productionChart')?.getContext('2d');
    if (productionCtx) {
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
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: chartData.status.labels,
                datasets: [{
                    label: 'Status dos Contratos',
                    data: chartData.status.values,
                    backgroundColor: [
                        '#198754', // success
                        '#ffc107', // warning
                        '#dc3545', // danger
                        '#6c757d', // secondary
                        '#0dcaf0', // info
                        '#0d6efd'  // primary
                    ],
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }
}