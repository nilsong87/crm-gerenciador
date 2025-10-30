import { enforceRoleAccess } from './auth-manager.js';
import { getAuditLogs } from './firestore-service.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';

let logsDataTable;

// 1. Restrict access to admins
export async function initializeLogsPage() {
    try {
        await enforceRoleAccess(['diretoria']);
        initializeDataTable();
        loadLogs();
    } catch (error) {
        handleError(error, 'Initialize Logs Page');
    }
}

function initializeDataTable() {
    if ($.fn.DataTable.isDataTable('#logsTable')) {
        $('#logsTable').DataTable().destroy();
    }

    logsDataTable = $('#logsTable').DataTable({
        columns: [
            { title: "Timestamp", data: 'timestamp', width: '20%' },
            { title: "Ator", data: 'actor', width: '20%' },
            { title: "Ação", data: 'action', width: '15%' },
            { title: "Detalhes", data: 'details', width: '45%' }
        ],
        responsive: true,
        language: {
            url: 'js/i18n/pt-BR.json',
            emptyTable: "Nenhum log de auditoria encontrado."
        },
        order: [[0, 'desc']] // Order by timestamp descending by default
    });
}

async function loadLogs() {
    showLoadingIndicator();
    try {
        const logs = await getAuditLogs();
        if (!logs) return;

        const tableData = logs.map(log => {
            return {
                timestamp: log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'N/A',
                actor: log.actor ? log.actor.email : 'Sistema',
                action: log.action,
                // Format details object as a readable string
                details: `<pre>${JSON.stringify(log.details, null, 2)}</pre>`
            };
        });

        logsDataTable.clear().rows.add(tableData).draw();
    } catch (error) {
        handleError(error, 'Load Audit Logs');
    } finally {
        hideLoadingIndicator();
    }
}
