const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

if (admin.apps.length === 0) {
  admin.initializeApp();
}


// --- PLACEHOLDER PARA INTEGRAÇÕES DE API ---

/**
 * Exemplo de como buscar dados da API do Workbank CRM.
 * A URL e a forma de autenticação são fictícias.
 */

/**
 * Exemplo de como buscar dados da API do Workbank CRM.
 * A URL e a forma de autenticação são fictícias.
 */
exports.syncWorkbankData = functions.https.onCall(async (data, context) => {
    // Verificação de permissão (exemplo: apenas diretoria)
    if (context.auth.token.role !== 'diretoria') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas a diretoria pode executar esta ação.');
    }

    try {
        // Substitua pela URL real e método de autenticação da API Workbank
        const API_URL = "https://api.workbank.com/v1/contracts";
        const API_KEY = functions.config().workbank.api_key;

        if (!API_KEY) {
            throw new functions.https.HttpsError('failed-precondition', 'Workbank API key not configured. Set it via firebase functions:config:set workbank.api_key="YOUR_API_KEY"');
        }

        const response = await axios.get(API_URL, {
            headers: { "Authorization": `Bearer ${API_KEY}` }
        });

        const contracts = response.data;
        functions.logger.info("Dados do Workbank recebidos, processando...", { count: contracts.length });

        // Aqui você processaria os dados e salvaria no Firestore.
        // Ex: const batch = admin.firestore().batch();
        // contracts.forEach(contract => {
        //     const docRef = admin.firestore().collection('contracts').doc(contract.id);
        //     batch.set(docRef, contract, { merge: true });
        // });
        // await batch.commit();

        return { success: true, message: `Dados do Workbank sincronizados. ${contracts.length} contratos processados.` };

    } catch (error) {
        functions.logger.error("Erro ao sincronizar dados do Workbank:", error);
        throw new functions.https.HttpsError('internal', 'Erro ao buscar dados do Workbank.');
    }
});

/**
 * Exemplo de como buscar dados de um CRM interno.
 */
exports.syncInternalCrmData = functions.https.onCall(async (data, context) => {
    // Verificação de permissão
    if (context.auth.token.role !== 'diretoria' && context.auth.token.role !== 'superintendencia') {
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para executar esta ação.');
    }

    try {
        // Substitua pela URL real e método de autenticação do seu CRM
        const API_URL = functions.config().crm.api_url;
        const API_KEY = functions.config().crm.api_key;

        if (!API_URL) {
            throw new functions.https.HttpsError('failed-precondition', 'CRM API URL not configured. Set it via firebase functions:config:set crm.api_url="YOUR_CRM_API_URL"');
        }
        if (!API_KEY) {
            throw new functions.https.HttpsError('failed-precondition', 'CRM API key not configured. Set it via firebase functions:config:set crm.api_key="YOUR_API_KEY"');
        }

        const response = await axios.get(API_URL, {
            headers: { "Authorization": `Bearer ${API_KEY}` }
        });
        const updates = response.data;
        
        functions.logger.info("Dados do CRM Interno recebidos:", updates);
        
        // Processar e salvar dados no Firestore

        return { success: true, message: "Dados do CRM interno sincronizados com sucesso." };

    } catch (error) {
        functions.logger.error("Erro ao sincronizar dados do CRM interno:", error);
        throw new functions.https.HttpsError('internal', 'Erro ao buscar dados do CRM interno.');
    }
});



/**
 * Gets a list of all users.
 * Only accessible by 'diretoria' and 'superintendencia' roles.
 */
exports.getUsers = functions.https.onCall(async (data, context) => {
    // Check for permission
    if (context.auth.token.role !== 'diretoria' && context.auth.token.role !== 'superintendencia') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem listar usuários.');
    }

    try {
        const userRecords = await admin.auth().listUsers(1000); // Max 1000 users per page
        const users = userRecords.users.map((user) => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            customClaims: user.customClaims,
            disabled: user.disabled,
        }));
        return users;
    } catch (error) {
        functions.logger.error("Erro ao listar usuários:", error);
        throw new functions.https.HttpsError('internal', 'Erro ao listar usuários.');
    }
});

/**
 * Sets a custom role for a user.
 * Only accessible by 'diretoria' and 'superintendencia' roles.
 */
exports.setUserRole = functions.https.onCall(async (data, context) => {
    // Check for permission
    if (context.auth.token.role !== 'diretoria' && context.auth.token.role !== 'superintendencia') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem alterar perfis.');
    }

    const { uid, role } = data;
    const validRoles = ['diretoria', 'superintendencia', 'gerencia_regional', 'comercial', 'operacional'];

    if (!uid || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'O UID do usuário e o perfil são obrigatórios.');
    }
    if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', `O perfil '${role}' é inválido.`);
    }

    try {
        await admin.auth().setCustomUserClaims(uid, { role: role });
        return { success: true, message: `Perfil do usuário ${uid} atualizado para '${role}'.` };
    } catch (error) {
        functions.logger.error("Erro ao definir perfil do usuário:", error);
        throw new functions.https.HttpsError('internal', 'Erro ao definir perfil do usuário.');
    }
});

/**
 * Triggered when a new user is created in Firebase Authentication.
 * Creates a corresponding user document in the 'users' collection in Firestore.
 */
exports.createUserDocument = functions.auth.user().onCreate((user) => {
  const { uid, email } = user;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);

  return userRef.set({
    uid,
    email,
    nome: email, // Using email as a placeholder for the name
    role: 'comercial', // Default role
    city: '', // Default empty city
    state: '', // Default empty state
  });
});

/**
 * Triggered when a new goal is created.
 * Creates a notification for the user the goal is assigned to.
 */
exports.createGoalNotification = functions.firestore
    .document('goals/{goalId}')
    .onCreate(async (snap, context) => {
        const goalData = snap.data();

        if (!goalData || !goalData.userId) {
            functions.logger.error('Goal creation trigger error: Missing goal data or userId.', { goalId: context.params.goalId });
            return null;
        }

        const notification = {
            userId: goalData.userId,
            message: `Nova meta atribuída a você: "${goalData.description}"`,
            link: 'metas.html',
            isRead: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        try {
            await admin.firestore().collection('notifications').add(notification);
            functions.logger.info(`Notification created for user ${goalData.userId} for goal ${context.params.goalId}`);
            return null;
        } catch (error) {
            functions.logger.error(`Error creating notification for user ${goalData.userId}:`, error);
            return null;
        }
    });