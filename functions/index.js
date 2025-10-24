
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
        const API_KEY = "SUA_API_KEY_WORKBANK"; // Idealmente, isso viria de functions.config()

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
        const API_URL = "https://crm-interno.suaempresa.com/api/updates";

        const response = await axios.get(API_URL);
        const updates = response.data;
        
        functions.logger.info("Dados do CRM Interno recebidos:", updates);
        
        // Processar e salvar dados no Firestore

        return { success: true, message: "Dados do CRM interno sincronizados com sucesso." };

    } catch (error) {
        functions.logger.error("Erro ao sincronizar dados do CRM interno:", error);
        throw new functions.https.HttpsError('internal', 'Erro ao buscar dados do CRM interno.');
    }
});
