// To run this script:
// 1. Make sure you have firebase-admin installed: npm install firebase-admin
// 2. Have your 'serviceAccountKey.json' in the functions directory or update the path.
// 3. Run the script: node js/seed-goals.js

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
    const serviceAccount = require('../functions/serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('Error initializing Firebase Admin SDK.');
    console.error('Please make sure you have a valid \'serviceAccountKey.json\' in the \'functions\' directory.');
    process.exit(1);
}

const db = admin.firestore();

// --- Sample Goals Data ---
// Note: You should replace these with actual user IDs and regions from your database.
const goals = [
    // Goal for a 'comercial' user
    {
        userId: 'USER_ID_COMERCIAL_1', // <-- Replace with a real user ID
        role: 'comercial',
        type: 'value', // 'value' or 'count'
        description: 'Meta de Vendas Pessoais',
        period: 'Outubro/2025',
        target: 15000, // R$ 15.000
        current: 8500,  // R$ 8.500
    },
    // Another goal for the same 'comercial' user
    {
        userId: 'USER_ID_COMERCIAL_1', // <-- Replace with a real user ID
        role: 'comercial',
        type: 'count',
        description: 'Meta de Contratos Fechados',
        period: 'Outubro/2025',
        target: 10,
        current: 6,
    },
    // Goal for a 'gerencia' user (regional)
    {
        regiao: 'Nordeste', // <-- Replace with a real region
        role: 'gerencia',
        type: 'value',
        description: 'Meta de Vendas Regional',
        period: 'Outubro/2025',
        target: 120000, // R$ 120.000
        current: 95000,
    },
    // Goal for 'diretoria' (company-wide)
    {
        role: 'diretoria',
        type: 'value',
        description: 'Meta de Faturamento Global',
        period: 'Outubro/2025',
        target: 750000, // R$ 750.000
        current: 610000,
    },
];

async function seedGoals() {
    console.log('Starting to seed the \'goals\' collection...');
    const goalsCollection = db.collection('goals');
    let goalsAdded = 0;

    for (const goal of goals) {
        try {
            await goalsCollection.add(goal);
            goalsAdded++;
        } catch (error) {
            console.error('Error adding goal:', error);
        }
    }

    console.log(`Seeding complete. ${goalsAdded} goals were added.`);
    process.exit(0);
}

seedGoals();
