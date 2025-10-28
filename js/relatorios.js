import { getContracts, getAllContractsForFiltering } from './firestore-service.js';
import { getCurrentUser, enforceRoleAccess } from './auth-manager.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';

enforceRoleAccess(['diretoria', 'superintendencia', 'gerencia_regional', 'comercial', 'operacional']);

let datepicker;
let reportsDataTable;
let contractsData = []; // To store the fetched data for export

// Called from relatorios.html after auth state is confirmed
export function initializeReports() {
    try {
        const user = getCurrentUser();
        console.log("Initializing reports for role:", user.role);

        datepicker = new Litepicker({
            element: document.getElementById('datepicker'),
            singleMode: false,
            format: 'DD/MM/YYYY',
            lang: 'pt-BR'
        });

        populateFilterOptions();
        initializeDataTable();

        document.getElementById('filter-button').addEventListener('click', generateReport);
        document.getElementById('export-pdf').addEventListener('click', exportPDF);
        document.getElementById('export-excel').addEventListener('click', exportExcel);
        document.getElementById('export-csv').addEventListener('click', exportCSV);
    } catch (error) {
        handleError(error, 'Initialize Reports');
    }
}

async function populateFilterOptions() {
    showLoadingIndicator();
    try {
        const contracts = await getAllContractsForFiltering();
        
        const promotoraFilter = document.getElementById('promotora-filter');
        const regiaoFilter = document.getElementById('regiao-filter');

        const promotoras = [...new Set(contracts.map(c => c.promotora).filter(Boolean))].sort();
        const regioes = [...new Set(contracts.map(c => c.regiao).filter(Boolean))].sort();

        promotoras.forEach(p => {
            const option = new Option(p, p);
            promotoraFilter.add(option);
        });

        regioes.forEach(r => {
            const option = new Option(r, r);
            regiaoFilter.add(option);
        });
    } catch (error) {
        handleError(error, 'Populate Filter Options');
    } finally {
        hideLoadingIndicator();
    }
}

function getFilters() {
    const status = document.getElementById('status-filter').value;
    const promotora = document.getElementById('promotora-filter').value;
    const regiao = document.getElementById('regiao-filter').value;
    const startDate = datepicker.getStartDate()?.toJSDate();
    const endDate = datepicker.getEndDate()?.toJSDate();

    return { status, promotora, regiao, startDate, endDate };
}

function initializeDataTable() {
    if ($.fn.DataTable.isDataTable('#reportsTable')) {
        $('#reportsTable').DataTable().destroy();
    }

    reportsDataTable = $('#reportsTable').DataTable({
        columns: [
            { title: "Contrato" },
            { title: "Cliente" },
            { title: "CPF" },
            { title: "Status" },
            { title: "Data" },
            { title: "Valor" },
            { title: "Promotora" },
            { title: "Região" }
        ],
        responsive: true,
        language: {
            url: 'js/i18n/pt-BR.json',
            emptyTable: "Nenhum dado disponível. Por favor, gere um relatório."
        }
    });
}

async function generateReport() {
    showLoadingIndicator();
    try {
        const filters = getFilters();
        console.log("Generating report with filters:", filters);

        contractsData = await getContracts(filters);
        
        const tableData = contractsData.map(c => {
            const contractDate = c.date?.toDate ? c.date.toDate().toLocaleDateString('pt-BR') : 'N/A';
            return [
                c.id,
                c.clientName || 'N/A',
                c.clientCpf || 'N/A',
                c.status || 'N/A',
                contractDate,
                `R$ ${c.value?.toFixed(2) || '0.00'}`, 
                c.promotora || 'N/A',
                c.regiao || 'N/A'
            ];
        });

        reportsDataTable.clear().rows.add(tableData).draw();
    } catch (error) {
        handleError(error, 'Generate Report');
    } finally {
        hideLoadingIndicator();
    }
}

function exportPDF() {
    try {
        if (contractsData.length === 0) {
            alert("Não há dados para exportar. Por favor, gere um relatório primeiro.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.autoTable({
            head: [['Contrato', 'Cliente', 'CPF', 'Status', 'Data', 'Valor', 'Promotora', 'Região']],
            body: contractsData.map(c => [
                c.id,
                c.clientName || 'N/A',
                c.clientCpf || 'N/A',
                c.status || 'N/A',
                c.date?.toDate ? c.date.toDate().toLocaleDateString('pt-BR') : 'N/A',
                `R$ ${c.value?.toFixed(2) || '0.00'} `,
                c.promotora || 'N/A',
                c.regiao || 'N/A'
            ]),
            startY: 20,
            styles: {
                fontSize: 8
            },
            headStyles: {
                fillColor: [13, 110, 253] // Primary blue color
            }
        });

        doc.text("Relatório de Contratos", 14, 15);
        doc.save("relatorio_contratos.pdf");
    } catch (error) {
        handleError(error, 'Export PDF');
    }
}

function exportExcel() {
    try {
        if (contractsData.length === 0) {
            alert("Não há dados para exportar. Por favor, gere um relatório primeiro.");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(contractsData.map(c => ({
            'Contrato': c.id,
            'Cliente': c.clientName || 'N/A',
            'CPF': c.clientCpf || 'N/A',
            'Status': c.status || 'N/A',
            'Data': c.date?.toDate ? c.date.toDate().toLocaleDateString('pt-BR') : 'N/A',
            'Valor': c.value || 0,
            'Promotora': c.promotora || 'N/A',
            'Região': c.regiao || 'N/A'
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos");

        // Format value as currency
        worksheet['!cols'] = [
            { wch: 20 }, // Contrato
            { wch: 30 }, // Cliente
            { wch: 15 }, // CPF
            { wch: 12 }, // Status
            { wch: 12 }, // Data
            { wch: 15, z: 'R$ #,##0.00' }, // Valor
            { wch: 20 }, // Promotora
            { wch: 20 }  // Região
        ];

        XLSX.writeFile(workbook, "relatorio_contratos.xlsx");
    } catch (error) {
        handleError(error, 'Export Excel');
    }
}

function exportCSV() {
    try {
        if (contractsData.length === 0) {
            alert("Não há dados para exportar. Por favor, gere um relatório primeiro.");
            return;
        }

        const headers = ['Contrato', 'Cliente', 'CPF', 'Status', 'Data', 'Valor', 'Promotora', 'Região'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const contract of contractsData) {
            const values = [
                contract.id,
                `"${contract.clientName || 'N/A'}"`, 
                `"${contract.clientCpf || 'N/A'}"`, 
                contract.status || 'N/A',
                contract.date?.toDate ? contract.date.toDate().toLocaleDateString('pt-BR') : 'N/A',
                contract.value || 0,
                `"${contract.promotora || 'N/A'}"`, 
                `"${contract.regiao || 'N/A'}"`
            ];
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'relatorio_contratos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        handleError(error, 'Export CSV');
    }
}