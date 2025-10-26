
// Import necessary Firebase admin tools
// To run this:
// 1. Make sure you have firebase-admin installed (`npm install firebase-admin`)
// 2. Set up Google Application Credentials. See: https://firebase.google.com/docs/admin/setup#initialize-sdk
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: Download your service account key from Firebase Console
// Project settings > Service accounts > Generate new private key
// Save it as 'firebase-admin-key.json' in the root of your project (or update path)
import serviceAccount from '../firebase-admin-key.json' assert { type: "json" };

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function seedDatabase() {
  console.log('Starting to seed the database...');

  // 1. Seed Users
  const users = [
    { uid: 'j4WjmWlHClVS88kxLXD5BoID3MV2', name: 'Nilson', email: 'diretoria@exemplo.com', role: 'diretoria' },
    { uid: 'J2nObHEGv0ftMyZYyY24KfTigj43', name: 'Amanda', email: 'superintendencia@exemplo.com', role: 'superintendencia' },
    { uid: 'LCbpKgJiowXmItWMeLPykoNNx222', name: 'Jessica', email: 'gerencia@exemplo.com', role: 'gerencia', regiao: 'Nordeste' },
    { uid: 'J8QGQwKOGaRSmAlRLzaemdHUrWu1', name: 'Carlos', email: 'comercial@exemplo.com', role: 'comercial' },
    { uid: 'PCsnW8axcQRXgj6V1J2Ra7qmPwg1', name: 'Pedro', email: 'operacional@exemplo.com', role: 'operacional' },
  ];

  console.log('Seeding users...');
  const userPromises = users.map(user => {
    const { uid, ...data } = user;
    return db.collection('users').doc(uid).set(data);
  });
  await Promise.all(userPromises);
  console.log('Users seeded successfully!');

  // 2. Seed Contracts
  const contracts = [
    { userId: 'J8QGQwKOGaRSmAlRLzaemdHUrWu1', clientName: 'Cliente A', clientCpf: '111.222.333-44', value: 2500, date: new Date(), status: 'pago', promotora: 'JL PROMOTORA', regiao: 'Nordeste', tabela: 'Tabela Padrão', tipoEmpresa: 'Privado' },
    { userId: 'J8QGQwKOGaRSmAlRLzaemdHUrWu1', clientName: 'Cliente B', clientCpf: '222.333.444-55', value: 1200, date: new Date(), status: 'pendente', promotora: 'JL PROMOTORA', regiao: 'Nordeste', tabela: 'Tabela Especial', tipoEmpresa: 'Público' },
    { userId: 'another-comercial-uid', clientName: 'Cliente C', clientCpf: '333.444.555-66', value: 3100, date: new Date(), status: 'cancelado', promotora: 'OUTRA PROMOTORA', regiao: 'Sudeste', tabela: 'Tabela Padrão', tipoEmpresa: 'Privado' },
  ];

  console.log('Seeding contracts...');
  const contractPromises = contracts.map(contract => db.collection('contracts').add(contract));
  await Promise.all(contractPromises);
  console.log('Contracts seeded successfully!');

  // 3. Seed Metas
  const metas = {
    metaGlobal: 100000,
    metasRegionais: {
      'Nordeste': 40000,
      'Sudeste': 60000,
    },
    metasComerciais: {
      'J8QGQwKOGaRSmAlRLzaemdHUrWu1': 15000, // Meta para o usuário 'Carlos'
    }
  };

  console.log('Seeding metas...');
  await db.collection('metas').doc('geral').set(metas);
  console.log('Metas seeded successfully!');

  console.log('Database seeding finished!');
}

seedDatabase().catch(console.error);
