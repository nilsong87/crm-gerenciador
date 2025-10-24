
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// Whitelist of allowed origins for CORS
const allowedOrigins = [
    'http://127.0.0.1:5500', // Exemplo para Live Server VSCode
    'http://localhost:3000',
    'https://crm-gerenciador.vercel.app',
    'https://nilsong87.github.io'
];

const cors = require("cors")({ 
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
});

if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.verifyRecaptcha = functions.runWith({ secrets: ["RECAPTCHA_SECRET"] }).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ success: false, error: 'Token não fornecido.' });
            }

            // Access the secret from process.env
            const secretKey = process.env.RECAPTCHA_SECRET;
            const verificationURL = `https://www.google.com/recaptcha/api/siteverify`;

            const response = await axios.post(verificationURL, null, {
                params: {
                    secret: secretKey,
                    response: token
                }
            });

            const responseData = response.data;

            if (responseData.success && responseData.score >= 0.5) {
                res.status(200).json({ success: true, score: responseData.score });
            } else {
                res.status(401).json({ success: false, error: 'A verificação do reCAPTCHA falhou.', details: responseData['error-codes'] });
            }
        } catch (error) {
            console.error('Erro na verificação reCAPTCHA:', error);
            res.status(500).json({ success: false, error: 'Erro interno ao verificar o reCAPTCHA.' });
        }
    });
});


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
