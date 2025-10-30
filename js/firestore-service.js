import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentUser } from './auth-manager.js';
import { handleError } from './error-handler.js';

const db = getFirestore(app);

async function getUser(uid) {
    try {
        console.log("Attempting to fetch user with UID:", uid);
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            console.log("User document found for UID:", uid);
            return userSnap.data();
        } else {
            console.log("No such user! Document does not exist for UID:", uid);
            return null;
        }
    } catch (error) {
        handleError(error, 'Get User');
        return null;
    }
}

async function updateUserName(uid, newName) {
    try {
        const userRef = doc(db, "users", uid);
        return await updateDoc(userRef, {
            nome: newName
        });
    } catch (error) {
        handleError(error, 'Update User Name');
    }
}


/**
 * Fetches all contracts from Firestore without any filters.
 * This is used to populate the filter dropdowns.
 * @returns {Promise<Array>} A promise that resolves to an array of contract objects.
 */
async function getAllContractsForFiltering() {
    try {
        const user = getCurrentUser();
        if (!user) return [];

        console.log(`Fetching all contracts for filter population for role: ${user.role}`);
        let q;
        if (user.role === 'comercial' && user.city) {
            q = query(collection(db, 'contracts'), where('city', '==', user.city));
        } else if (user.role === 'operacional') {
            q = query(collection(db, 'contracts'), where('userId', '==', user.uid));
        } else if (user.role === 'gerencia_regional' && user.state) {
            q = query(collection(db, 'contracts'), where('state', '==', user.state));
        } else {
            // For other roles like 'diretoria' and 'superintendencia', fetch all.
            q = query(collection(db, 'contracts'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        handleError(error, 'Get All Contracts For Filtering');
        return [];
    }
}

/**
 * Fetches contracts from Firestore based on role and filters.
 * @param {object} filters - The filters to apply.
 * @returns {Promise<Array>} A promise that resolves to an array of contract objects.
 */
async function getContracts(filters = {}) {
    try {
        const user = getCurrentUser();
        if (!user) return [];

        const { status, startDate, endDate, promotora, regiao, cpfContrato, tabela, tipoEmpresa } = filters;
        let constraints = [];

        console.log(`Fetching data for user ${user.uid} with role: ${user.role}`);

        // Role-based constraints
        if (user.role === 'comercial' && user.city) {
            constraints.push(where('city', '==', user.city));
        } else if (user.role === 'gerencia_regional' && user.state) {
            constraints.push(where('state', '==', user.state));
        } else if (user.role === 'operacional') {
            constraints.push(where('userId', '==', user.uid));
        }
        // For 'diretoria' and 'superintendencia', no constraints are added, so they see all contracts.

        // Filter constraints
        if (status) {
            constraints.push(where('status', '==', status));
        }
        if (promotora) {
            constraints.push(where('promotora', '==', promotora));
        }
        if (regiao) {
            constraints.push(where('regiao', '==', regiao));
        }
        if (tabela) {
            constraints.push(where('tabela', '==', tabela));
        }
        if (tipoEmpresa) {
            constraints.push(where('tipoEmpresa', '==', tipoEmpresa));
        }
        if (cpfContrato) {
            constraints.push(where('clientCpf', '==', cpfContrato));
        }
        if (startDate) {
            constraints.push(where('date', '>=', startDate));
        }
        if (endDate) {
            constraints.push(where('date', '<=', endDate));
        }

        const q = query(collection(db, 'contracts'), ...constraints, orderBy('date', 'desc'));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleError(error, 'Get Contracts');
        return [];
    }
}

/**
 * Fetches KPI data from Firestore based on role and filters.
 * @param {object} filters - The filters to apply.
 * @returns {Promise<Object>} A promise that resolves to an object with KPI values.
 */
async function getKpis(filters = {}) {
    try {
        const contracts = await getContracts(filters);
        
        const totalContracts = contracts.length;
        let totalValue = 0;
        let activeContracts = 0;

        contracts.forEach(contract => {
            totalValue += contract.value || 0;
            if (contract.status === 'pago' || contract.status === 'pendente') {
                activeContracts++;
            }
        });

        const averageTicket = totalContracts > 0 ? totalValue / totalContracts : 0;

        return {
            totalContracts,
            activeContracts,
            averageTicket: averageTicket,
            totalValue: totalValue
        };
    } catch (error) {
        handleError(error, 'Get KPIs');
        return {
            totalContracts: 0,
            activeContracts: 0,
            averageTicket: 0,
            totalValue: 0
        };
    }
}

/**
 * Fetches data for dashboard charts based on role and filters.
 * @param {object} filters - The filters to apply.
 * @param {string} marketShareDimension - The dimension for the market share chart.
 * @returns {Promise<Object>} A promise that resolves to an object with chart data.
 */
async function getChartData(filters = {}, marketShareDimension = 'promotora') {
    try {
        const contracts = await getContracts(filters);
        
        const productionData = {}; // { 'YYYY-MM': totalValue }
        const marketShareData = {}; // { dimensionValue: count }
        const statusData = {}; // { status: count }

        contracts.forEach(contract => {
            // Production data (monthly)
            if (contract.date && contract.value) {
                const date = contract.date.toDate();
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                productionData[monthKey] = (productionData[monthKey] || 0) + contract.value;
            }

            // Market share data (dynamic dimension)
            const dimensionValue = contract[marketShareDimension];
            if (dimensionValue) {
                marketShareData[dimensionValue] = (marketShareData[dimensionValue] || 0) + 1;
            }

            // Status data
            const statusValue = contract.status || 'desconhecido';
            statusData[statusValue] = (statusData[statusValue] || 0) + 1;
        });

        const sortedProduction = Object.entries(productionData).sort(([a], [b]) => a.localeCompare(b));
        const productionLabels = sortedProduction.map(([key]) => key);
        const productionValues = sortedProduction.map(([, value]) => value);

        const marketShareLabels = Object.keys(marketShareData);
        const marketShareValues = Object.values(marketShareData);

        const statusLabels = Object.keys(statusData);
        const statusValues = Object.values(statusData);

        return {
            production: { labels: productionLabels, values: productionValues },
            marketShare: { labels: marketShareLabels, values: marketShareValues },
            status: { labels: statusLabels, values: statusValues }
        };

    } catch (error) {
        handleError(error, 'Get Chart Data');
        return {
            production: { labels: [], values: [] },
            marketShare: { labels: [], values: [] },
            status: { labels: [], values: [] }
        };
    }
}

/**
 * Calculates the ranking of promoters based on total contract value.
 * @param {object} filters - The filters to apply.
 * @returns {Promise<Array>} A promise that resolves to a sorted array of promoter ranking objects.
 */
async function getPromoterRanking(filters = {}) {
    try {
        const contracts = await getContracts(filters);
        const ranking = {}; // { promoterName: totalValue }

        contracts.forEach(contract => {
            if (contract.promotora && contract.value) {
                if (!ranking[contract.promotora]) {
                    ranking[contract.promotora] = 0;
                }
                ranking[contract.promotora] += contract.value;
            }
        });

        const sortedRanking = Object.entries(ranking)
            .map(([promoter, totalValue]) => ({ promoter, totalValue }))
            .sort((a, b) => b.totalValue - a.totalValue);

        return sortedRanking;

    } catch (error) {
        handleError(error, 'Get Promoter Ranking');
        return [];
    }
}

async function getGoals() {
    try {
        const user = getCurrentUser();
        if (!user) return [];

        let constraints = [];

        if (user.role === 'operacional') {
            constraints.push(where('userId', '==', user.uid));
        } else if (user.role === 'comercial' && user.city) {
            constraints.push(where('city', '==', user.city));
        } else if (user.role === 'gerencia_regional' && user.state) {
            constraints.push(where('state', '==', user.state));
        }

        const q = query(collection(db, 'goals'), ...constraints);
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleError(error, 'Get Goals');
        return [];
    }
}

/**
 * Fetches a list of all users from the 'users' collection in Firestore.
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 */
async function getUsers() {
    try {
        const user = getCurrentUser();
        if (!user) return [];

        const usersCollection = collection(db, 'users');
        let q;

        if (user.role === 'diretoria' || user.role === 'superintendencia') {
            q = query(usersCollection);
        } else if (user.role === 'gerencia_regional' && user.state) {
            q = query(usersCollection, where('state', '==', user.state));
        } else if (user.role === 'comercial' && user.city) {
            q = query(usersCollection, where('city', '==', user.city));
        } else {
            // Should not happen based on page access rules, but as a fallback
            return [];
        }

        const userSnapshot = await getDocs(q);
        const userList = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        return userList;
    } catch (error) {
        handleError(error, 'Get Users');
        return null;
    }
}

async function getContractsForUser(selectedUserId) {
    try {
        const user = getCurrentUser();
        if (!user) return [];

        let constraints = [];

        // Add the main filter for the selected user
        constraints.push(where('userId', '==', selectedUserId));

        // Add role-based constraints for the logged-in user
        if (user.role === 'comercial' && user.city) {
            constraints.push(where('city', '==', user.city));
        } else if (user.role === 'gerencia_regional' && user.state) {
            constraints.push(where('state', '==', user.state));
        }
        // For 'diretoria' and 'superintendencia', no additional constraints are needed.
        // 'operacional' can only see their own data, which is already handled by the initial 'userId' filter.

        const q = query(collection(db, 'contracts'), ...constraints, orderBy('date', 'desc'));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleError(error, 'Get Contracts For User');
        return [];
    }
}

function getKpisForUser(contracts) {
    if (!contracts) {
        return {
            totalContracts: 0,
            activeContracts: 0,
            averageTicket: 0,
            totalValue: 0
        };
    }

    const totalContracts = contracts.length;
    let totalValue = 0;
    let activeContracts = 0;

    contracts.forEach(contract => {
        totalValue += contract.value || 0;
        if (contract.status === 'pago' || contract.status === 'pendente') {
            activeContracts++;
        }
    });

    const averageTicket = totalContracts > 0 ? totalValue / totalContracts : 0;

    return {
        totalContracts,
        activeContracts,
        averageTicket: averageTicket,
        totalValue: totalValue
    };
}

function getChartDataForUser(contracts) {
    if (!contracts) {
        return {
            production: { labels: [], values: [] },
            status: { labels: [], values: [] }
        };
    }

    const productionData = {}; // { 'YYYY-MM': totalValue }
    const statusData = {}; // { status: count }

    contracts.forEach(contract => {
        // Production data (monthly)
        if (contract.date && contract.value) {
            const date = contract.date.toDate();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            productionData[monthKey] = (productionData[monthKey] || 0) + contract.value;
        }

        // Status data
        const statusValue = contract.status || 'desconhecido';
        statusData[statusValue] = (statusData[statusValue] || 0) + 1;
    });

    const sortedProduction = Object.entries(productionData).sort(([a], [b]) => a.localeCompare(b));
    const productionLabels = sortedProduction.map(([key]) => key);
    const productionValues = sortedProduction.map(([, value]) => value);

    const statusLabels = Object.keys(statusData);
    const statusValues = Object.values(statusData);

    return {
        production: { labels: productionLabels, values: productionValues },
        status: { labels: statusLabels, values: statusValues }
    };
}

async function addGoal(goalData) {
    try {
        const goalsCollection = collection(db, 'goals');
        const docRef = await addDoc(goalsCollection, goalData);
        return docRef.id;
    } catch (error) {
        handleError(error, 'Add Goal');
        return null;
    }
}

async function updateGoal(goalId, goalData) {
    try {
        const goalRef = doc(db, 'goals', goalId);
        await updateDoc(goalRef, goalData);
        return true;
    } catch (error) {
        handleError(error, 'Update Goal');
        return false;
    }
}

async function deleteGoal(goalId) {
    try {
        const goalRef = doc(db, 'goals', goalId);
        await deleteDoc(goalRef);
        return true;
    } catch (error) {
        handleError(error, 'Delete Goal');
        return false;
    }
}

async function getAssignableUsers() {
    try {
        const user = getCurrentUser();
        if (!user) return [];

        let constraints = [];

        if (user.role === 'comercial' && user.city) {
            constraints.push(where('role', '==', 'operacional'));
            constraints.push(where('city', '==', user.city));
        } else if (user.role === 'gerencia_regional' && user.state) {
            constraints.push(where('role', '==', 'comercial'));
            constraints.push(where('state', '==', user.state));
        } else if (user.role === 'superintendencia') {
            constraints.push(where('role', '==', 'gerencia_regional'));
        } else if (user.role === 'diretoria') {
            // No constraints, fetch all users
        } else {
            // 'operacional' or other roles cannot assign goals
            return [];
        }

        const q = query(collection(db, 'users'), ...constraints);
        
        const snapshot = await getDocs(q);
        if (user.role === 'diretoria') {
            const allUsers = await getUsers();
            return allUsers;
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleError(error, 'Get Assignable Users');
        return [];
    }
}

async function getAuditLogs() {
    try {
        // The security rules will enforce that only admins can read this collection.
        const logsCollection = collection(db, 'audit_logs');
        const q = query(logsCollection, orderBy('timestamp', 'desc'));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleError(error, 'Get Audit Logs');
        return []; // Return an empty array on error
    }
}

function getNotifications(userId, callback) {
    try {
        const notificationsCollection = collection(db, 'notifications');
        const q = query(
            notificationsCollection, 
            where('userId', '==', userId), 
            orderBy('timestamp', 'desc')
        );

        // Use onSnapshot for real-time updates
        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(notifications);
        }, (error) => {
            handleError(error, 'Get Notifications Snapshot');
        });
    } catch (error) {
        handleError(error, 'Get Notifications');
        return () => {}; // Return an empty unsubscribe function on initial error
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        return await updateDoc(notificationRef, {
            isRead: true
        });
    } catch (error) {
        handleError(error, 'Mark Notification As Read');
    }
}

async function getContract(contractId) {
    try {
        const contractRef = doc(db, "contracts", contractId);
        const contractSnap = await getDoc(contractRef);
        if (contractSnap.exists()) {
            return { id: contractSnap.id, ...contractSnap.data() };
        } else {
            console.log("No such contract!");
            return null;
        }
    } catch (error) {
        handleError(error, 'Get Contract');
        return null;
    }
}

export { db, getContracts, getKpis, getChartData, getAllContractsForFiltering, getPromoterRanking, getGoals, getUsers, getUser, updateUserName, getContractsForUser, getKpisForUser, getChartDataForUser, addGoal, updateGoal, deleteGoal, getAssignableUsers, getAuditLogs, getNotifications, markNotificationAsRead, getContract };
