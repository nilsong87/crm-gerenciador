import { getGoals, addGoal, updateGoal, deleteGoal, getUser, getAssignableUsers } from './firestore-service.js';
import { getCurrentUser, enforceRoleAccess } from './auth-manager.js';
import { handleError } from './error-handler.js';
import { showLoadingIndicator, hideLoadingIndicator } from './loading-indicator.js';

enforceRoleAccess(['diretoria', 'superintendencia', 'gerencia_regional', 'comercial', 'operacional']);

let goalModal;

// Called from metas.html after auth state is confirmed
export async function initializeMetas() {
    showLoadingIndicator();
    try {
        const user = getCurrentUser();
        console.log("Initializing metas for role:", user.role);
        goalModal = new bootstrap.Modal(document.getElementById('goalModal'));

        const addGoalButton = document.getElementById('add-goal-button');
        const saveGoalButton = document.getElementById('save-goal-button');

        if (canWriteGoals(user.role)) {
            addGoalButton.style.display = 'block';
            addGoalButton.addEventListener('click', () => openGoalModal());
        }

        saveGoalButton.addEventListener('click', saveGoal);

        await loadGoals();
    } catch (error) {
        handleError(error, 'Initialize Metas');
    } finally {
        hideLoadingIndicator();
    }
}

function canWriteGoals(role) {
    return ['diretoria', 'superintendencia', 'gerente_regional', 'comercial'].includes(role);
}

async function loadGoals() {
    showLoadingIndicator();
    try {
        const goalsContainer = document.getElementById('goals-container');
        if (!goalsContainer) return;

        goalsContainer.innerHTML = '<p>Carregando metas...</p>';
        const goals = await getGoals();

        if (!goals || goals.length === 0) {
            goalsContainer.innerHTML = '<p>Nenhuma meta encontrada para o seu perfil.</p>';
            return;
        }

        goalsContainer.innerHTML = '';
        goals.forEach(goal => {
            const goalCard = createGoalCard(goal);
            goalsContainer.appendChild(goalCard);
        });
    } catch (error) {
        handleError(error, 'Load Goals');
    } finally {
        hideLoadingIndicator();
    }
}

function createGoalCard(goal) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';

    const percentage = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    const progressColor = percentage >= 100 ? 'bg-success' : (percentage >= 60 ? 'bg-info' : 'bg-warning');

    const formattedCurrent = goal.type === 'value' ? `R$ ${goal.current.toFixed(2)}` : goal.current;
    const formattedTarget = goal.type === 'value' ? `R$ ${goal.target.toFixed(2)}` : goal.target;

    const user = getCurrentUser();
    let actionButtons = '';
    if (canWriteGoals(user.role)) {
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

    if (canWriteGoals(user.role)) {
        col.querySelector('.edit-goal-btn').addEventListener('click', () => openGoalModal(goal));
        col.querySelector('.delete-goal-btn').addEventListener('click', () => handleDeleteGoal(goal.id));
    }

    return col;
}

async function openGoalModal(goal = null) {
    showLoadingIndicator();
    try {
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

        const user = getCurrentUser();
        if (canWriteGoals(user.role)) {
            assignUserContainer.style.display = 'block';
            const assignableUsers = await getAssignableUsers();
            
            if (assignableUsers && assignableUsers.length > 0) {
                assignableUsers.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.uid;
                    option.textContent = u.nome;
                    userSelect.appendChild(option);
                });
            } else {
                // If no assignable users, add the current user as the only option
                const option = document.createElement('option');
                option.value = user.uid;
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
    } catch (error) {
        handleError(error, 'Open Goal Modal');
    } finally {
        hideLoadingIndicator();
    }
}

async function saveGoal() {
    showLoadingIndicator();
    try {
        const user = getCurrentUser();
        const goalId = document.getElementById('goal-id').value;
        const assignedUserId = document.getElementById('goal-user').value || user.uid;

        const goalData = {
            description: document.getElementById('goal-description').value,
            type: document.getElementById('goal-type').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value),
            period: document.getElementById('goal-period').value,
            userId: assignedUserId,
        };

        const assignedUserData = await getUser(assignedUserId);
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
        await loadGoals();
    } catch (error) {
        handleError(error, 'Save Goal');
    } finally {
        hideLoadingIndicator();
    }
}

async function handleDeleteGoal(goalId) {
    showLoadingIndicator();
    try {
        if (confirm('Tem certeza de que deseja excluir esta meta?')) {
            await deleteGoal(goalId);
            await loadGoals();
        }
    } catch (error) {
        handleError(error, 'Delete Goal');
    } finally {
        hideLoadingIndicator();
    }
}