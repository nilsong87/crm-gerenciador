import { getGoals } from './firestore-service.js';

// Called from metas.html after auth state is confirmed
export function initializeMetas(uid, role) {
    console.log("Initializing metas for role:", role);
    loadGoals(uid, role);
}

async function loadGoals(uid, role) {
    const goalsContainer = document.getElementById('goals-container');
    if (!goalsContainer) return;

    // Show a loading indicator
    goalsContainer.innerHTML = '<p>Carregando metas...</p>';

    const goals = await getGoals(uid, role);

    if (!goals || goals.length === 0) {
        goalsContainer.innerHTML = '<p>Nenhuma meta encontrada para o seu perfil.</p>';
        return;
    }

    // Clear loading indicator
    goalsContainer.innerHTML = '';

    goals.forEach(goal => {
        const goalCard = createGoalCard(goal);
        goalsContainer.appendChild(goalCard);
    });
}

function createGoalCard(goal) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';

    const percentage = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    const progressColor = percentage >= 100 ? 'bg-success' : (percentage >= 60 ? 'bg-info' : 'bg-warning');

    const formattedCurrent = goal.type === 'value' ? `R$ ${goal.current.toFixed(2)}` : goal.current;
    const formattedTarget = goal.type === 'value' ? `R$ ${goal.target.toFixed(2)}` : goal.target;

    col.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">${goal.description}</h5>
                    <span class="badge bg-primary">${goal.period}</span>
                </div>
                <p class="card-text text-muted">Tipo: ${goal.type === 'value' ? 'Valor Monetário' : 'Contagem'}</p>
                
                <div class="mt-3">
                    <div class="d-flex justify-content-between">
                        <span>${formattedCurrent}</span>
                        <span>${formattedTarget}</span>
                    </div>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${percentage.toFixed(2)}%;" aria-valuenow="${percentage.toFixed(2)}" aria-valuemin="0" aria-valuemax="100">${percentage.toFixed(0)}%</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return col;
}
