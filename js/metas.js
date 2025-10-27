import { getGoals, addGoal, updateGoal, deleteGoal, getUserData, getAssignableUsers } from './firestore-service.js';

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

    const assignUserContainer = document.getElementById('assign-user-container');
    const userSelect = document.getElementById('goal-user');
    userSelect.innerHTML = '';

    if (canWriteGoals(currentUserRole)) {
        assignUserContainer.style.display = 'block';
        const assignableUsers = await getAssignableUsers(currentUser, currentUserRole);
        
        if (assignableUsers && assignableUsers.length > 0) {
            assignableUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.uid;
                option.textContent = user.nome;
                userSelect.appendChild(option);
            });
        } else {
            // If no assignable users, add the current user as the only option
            const option = document.createElement('option');
            option.value = currentUser;
            option.textContent = 'Atribuir a mim mesmo';
            userSelect.appendChild(option);
        }

        if (goal && goal.userId) {
            userSelect.value = goal.userId;
        }
    } else {
        assignUserContainer.style.display = 'none';
    }

    goalModal.show();
}

async function saveGoal() {
    const goalId = document.getElementById('goal-id').value;
    const assignedUserId = document.getElementById('goal-user').value || currentUser;

    const goalData = {
        description: document.getElementById('goal-description').value,
        type: document.getElementById('goal-type').value,
        target: parseFloat(document.getElementById('goal-target').value),
        current: parseFloat(document.getElementById('goal-current').value),
        period: document.getElementById('goal-period').value,
        userId: assignedUserId,
    };

    const assignedUserData = await getUserData(assignedUserId);
    if (assignedUserData) {
        goalData.city = assignedUserData.city || '';
        goalData.state = assignedUserData.state || '';
        goalData.region = assignedUserData.region || '';
    }

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
