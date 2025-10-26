const admin = require('firebase-admin');

// IMPORTANT: Download your Firebase service account key JSON file,
// save it as 'serviceAccountKey.json' in the project's root directory.
try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://crm-gerenciamento-default-rtdb.firebaseio.com" // From your Firebase config
    });
} catch (error) {
    console.error('Error initializing Firebase Admin SDK.');
    console.error('Please make sure you have a valid \'serviceAccountKey.json\' in the root directory.');
    process.exit(1);
}


const db = admin.firestore();

const contracts = [
    {
        clientName: "Empresa Alpha",
        clientCpf: "111.222.333-44",
        status: "pago",
        date: new Date("2025-10-20"),
        value: 2500.50,
        promoter: "João da Silva"
    },
    {
        clientName: "Consultoria Beta",
        clientCpf: "222.333.444-55",
        status: "pendente",
        date: new Date("2025-10-22"),
        value: 1800.00,
        promoter: "Maria Oliveira"
    },
    {
        clientName: "Serviços Gamma",
        clientCpf: "333.444.555-66",
        status: "cancelado",
        date: new Date("2025-09-15"),
        value: 3200.75,
        promoter: "Carlos Pereira"
    },
    {
        clientName: "Indústria Delta",
        clientCpf: "444.555.666-77",
        status: "pago",
        date: new Date("2025-10-18"),
        value: 5500.00,
        promoter: "João da Silva"
    },
    {
        clientName: "Comércio Epsilon",
        clientCpf: "555.666.777-88",
        status: "pendente",
        date: new Date("2025-10-23"),
        value: 850.25,
        promoter: "Ana Costa"
    }
];

async function seedDatabase() {
    const contractsCollection = db.collection('contracts');
    console.log("Seeding database...");

    const deletePromises = [];
    const snapshot = await contractsCollection.get();
    snapshot.forEach(doc => {
        deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);
    console.log('Existing contracts deleted.');


    for (const contract of contracts) {
        try {
            await contractsCollection.add(contract);
            console.log(`Added contract for ${contract.clientName}`);
        } catch (error) {
            console.error(`Error adding contract for ${contract.clientName}:`, error);
        }
    }

    console.log("Database seeding complete.");
}

seedDatabase().then(() => {
    process.exit(0);
}).catch(error => {
    console.error("Error seeding database:", error);
    process.exit(1);
});
