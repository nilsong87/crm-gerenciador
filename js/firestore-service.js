import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const db = getFirestore(app);

/**
 * Fetches all contracts from Firestore without any filters.
 * This is used to populate the filter dropdowns.
 * @param {string} role - The user's role.
 * @returns {Promise<Array>} A promise that resolves to an array of contract objects.
 */
async function getAllContractsForFiltering(uid, role) {
    console.log(`Fetching all contracts for filter population for role: ${role}`);
    let q;
    if (role === 'comercial' || role === 'operacional') {
        q = query(collection(db, 'contracts'), where('userId', '==', uid));
    } else if (role === 'gerencia') {
        const userData = await getUserData(uid);
        if (userData && userData.regiao) {
            q = query(collection(db, 'contracts'), where('regiao', '==', userData.regiao));
        } else {
            // Gerencia without a region, return nothing to avoid errors.
            return [];
        }
    } else {
        // For other roles like 'diretoria' and 'superintendencia', fetch all.
        q = query(collection(db, 'contracts'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}


async function getUserData(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return userSnap.data();
    } else {
        console.log("No such user!");
        return null;
    }
}

/**
 * Fetches contracts from Firestore based on role and filters.
 * @param {string} uid - The user's ID.
 * @param {string} role - The user's role.
 * @param {object} filters - The filters to apply.
 * @returns {Promise<Array>} A promise that resolves to an array of contract objects.
 */
async function getContracts(uid, role, filters = {}) {
    const { status, startDate, endDate, promotora, regiao, cpfContrato, tabela, tipoEmpresa } = filters;
    let constraints = [];

    console.log(`Fetching data for user ${uid} with role: ${role}`);

    // Role-based constraints
    if (role === 'comercial' || role === 'operacional') {
        constraints.push(where('userId', '==', uid));
    } else if (role === 'gerencia') {
        const userData = await getUserData(uid);
        if (userData && userData.regiao) {
            constraints.push(where('regiao', '==', userData.regiao));
        }
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
    // NOTE: This filter only searches the clientCpf field, not the contract ID.
    // For a more robust search, the data should be structured to include a combined search field.
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
}

/**
 * Fetches KPI data from Firestore based on role and filters.
 * @param {string} role - The user's role.
 * @param {object} filters - The filters to apply.
 * @returns {Promise<Object>} A promise that resolves to an object with KPI values.
 */
async function getKpis(uid, role, filters = {}) {
    try {
        const contracts = await getContracts(uid, role, filters);
        
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
            averageTicket: averageTicket.toFixed(2),
            totalValue: totalValue.toFixed(2)
        };
    } catch (error) {
        console.error("Error fetching KPIs: ", error);
        return {
            totalContracts: 0,
            activeContracts: 0,
            averageTicket: '0.00',
            totalValue: '0.00'
        };
    }
}

/**
 * Fetches data for dashboard charts based on role and filters.
 * @param {string} uid - The user's ID.
 * @param {string} role - The user's role.
 * @param {object} filters - The filters to apply.
 * @param {string} marketShareDimension - The dimension for the market share chart.
 * @returns {Promise<Object>} A promise that resolves to an object with chart data.
 */
async function getChartData(uid, role, filters = {}, marketShareDimension = 'promotora') {
    try {
        const contracts = await getContracts(uid, role, filters);
        
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
        console.error("Error fetching chart data: ", error);
        return {
            production: { labels: [], values: [] },
            marketShare: { labels: [], values: [] },
            status: { labels: [], values: [] }
        };
    }
}

/**
 * Calculates the ranking of promoters based on total contract value.
 * @param {string} uid - The user's ID.
 * @param {string} role - The user's role.
 * @param {object} filters - The filters to apply.
 * @returns {Promise<Array>} A promise that resolves to a sorted array of promoter ranking objects.
 */
async function getPromoterRanking(uid, role, filters = {}) {
    try {
        const contracts = await getContracts(uid, role, filters);
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
        console.error("Error fetching promoter ranking: ", error);
        return [];
    }
}

/**
 * Fetches goals from Firestore based on user role.
 * @param {string} uid - The user's ID.
 * @param {string} role - The user's role.
 * @returns {Promise<Array>} A promise that resolves to an array of goal objects.
 */
async function getGoals(uid, role) {
    try {
        let q;
        if (role === 'comercial' || role === 'operacional') {
            q = query(collection(db, 'goals'), where('userId', '==', uid));
        } else if (role === 'gerencia') {
            const userData = await getUserData(uid);
            if (userData && userData.regiao) {
                q = query(collection(db, 'goals'), where('regiao', '==', userData.regiao));
            } else {
                // Gerencia without a region, fetch their own goals only
                q = query(collection(db, 'goals'), where('userId', '==', uid));
            }
        } else {
            // Diretoria and Superintendencia see all goals
            q = query(collection(db, 'goals'), orderBy('period', 'desc'));
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("No goals found for this user/role.");
            return [];
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Error fetching goals: ", error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches a list of all users from the 'users' collection in Firestore.
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 */
async function getUsers() {
    try {
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        return userList;
    } catch (error) {
        console.error("Error fetching users:", error);
        return null;
    }
}

export { db, getContracts, getKpis, getChartData, getAllContractsForFiltering, getPromoterRanking, getGoals, getUsers };