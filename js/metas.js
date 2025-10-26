import { getGoals, addGoal, updateGoal, deleteGoal, getUserData } from './firestore-service.js';

let goalModal;
let currentUser;
let currentUserRole;

// Called from metas.html after auth state is confirmed
export async function initializeMetas(uid, role) {
    console.log("Initializing metas for role:", role);
    currentUser = uid;
    currentUserRole = role;
    goalModal = new bootstrap.Modal(document.getElementById('goalModal'));

    const addGoalButton = document.getElementById('add-goal-button');
    const saveGoalButton = document.getElementById('save-goal-button');

    if (canWriteGoals(role)) {
        addGoalButton.style.display = 'block';
        addGoalButton.addEventListener('click', () => openGoalModal());
    }

    saveGoalButton.addEventListener('click', saveGoal);

    loadGoals(uid, role);
}

function canWriteGoals(role) {
    return ['diretoria', 'gerencia', 'superintendencia', 'gerente_regional', 'comercial'].includes(role);
}

async function loadGoals(uid, role) {
    const goalsContainer = document.getElementById('goals-container');
    if (!goalsContainer) return;

    goalsContainer.innerHTML = '<p>Carregando metas...</p>';
    const goals = await getGoals(uid, role);

    if (!goals || goals.length === 0) {
        goalsContainer.innerHTML = '<p>Nenhuma meta encontrada para o seu perfil.</p>';
        return;
    }

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

    let actionButtons = '';
    if (canWriteGoals(currentUserRole)) {
        actionButtons = `
            <div class="position-absolute top-0 end-0 p-2">
                <button class="btn btn-sm btn-outline-primary edit-goal-btn"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-goal-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }

    col.innerHTML = `
        <div class="card h-100">
            <div class="card-body position-relative">
                ${actionButtons}
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

    if (canWriteGoals(currentUserRole)) {
        col.querySelector('.edit-goal-btn').addEventListener('click', () => openGoalModal(goal));
        col.querySelector('.delete-goal-btn').addEventListener('click', () => handleDeleteGoal(goal.id));
    }

    return col;
}

async function openGoalModal(goal = null) {
    const form = document.getElementById('goal-form');
    form.reset();
    document.getElementById('goal-id').value = goal ? goal.id : '';
    
    if (goal) {
        document.getElementById('goal-description').value = goal.description;
        document.getElementById('goal-type').value = goal.type;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-period').value = goal.period;
    }

    // Add hierarchy fields based on role
    const hierarchyFields = document.getElementById('hierarchy-fields');
    hierarchyFields.innerHTML = '';
    const userData = await getUserData(currentUser);

    if (currentUserRole === 'comercial') {
        hierarchyFields.innerHTML = `<input type="hidden" id="goal-city" value="${userData.city}"><input type="hidden" id="goal-state" value="${userData.state}"><input type="hidden" id="goal-region" value="${userData.region}">`;
    }
    // Add more logic for other roles if they need to select region/state/city

    goalModal.show();
}

async function saveGoal() {
    const goalId = document.getElementById('goal-id').value;
    const goalData = {
        description: document.getElementById('goal-description').value,
        type: document.getElementById('goal-type').value,
        target: parseFloat(document.getElementById('goal-target').value),
        current: parseFloat(document.getElementById('goal-current').value),
        period: document.getElementById('goal-period').value,
        userId: currentUser, // Assign the goal to the logged-in user
    };

    // Add hierarchy data
    if (currentUserRole === 'comercial') {
        goalData.city = document.getElementById('goal-city').value;
        goalData.state = document.getElementById('goal-state').value;
        goalData.region = document.getElementById('goal-region').value;
    }
    // Add more logic for other roles

    if (goalId) {
        // Update existing goal
        await updateGoal(goalId, goalData);
    } else {
        // Add new goal
        await addGoal(goalData);
    }

    goalModal.hide();
    loadGoals(currentUser, currentUserRole);
}

async function handleDeleteGoal(goalId) {
    if (confirm('Tem certeza de que deseja excluir esta meta?')) {
        await deleteGoal(goalId);
        loadGoals(currentUser, currentUserRole);
    }
}