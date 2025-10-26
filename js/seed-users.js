import { getFirestore, doc, setDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { app } from './firebase-config.js';

const db = getFirestore(app);

// --- DADOS DE EXEMPLO ---
// O ID do documento (primeiro parâmetro) DEVE ser o UID do usuário no Firebase Authentication.
const usersToSeed = {
    // UID do seu usuário de diretoria, pego dos logs
    'j4WjmWlHClVS88kxLXD5BoID3MV2': {
        nome: 'Lucas Silva',
        email: 'diretoria@exemplo.com',
        role: 'diretoria',
        state: 'BA',
        city: 'Salvador',
        uid: 'j4WjmWlHClVS88kxLXD5BoID3MV2'
    },
    // UIDs de exemplo para outros usuários. Para usuários reais, substitua pelos UIDs corretos.
    'DMjnn0e1z9QW73f8l9sWV56K0PB3': {
        nome: 'Marcelo Oliveira',
        email: 'super@exemplo.com',
        role: 'superintendencia',
        state: 'SP',
        city: 'São Paulo',
        uid: 'placeholder_uid_super'
    },
    'jimmKebXL6M9naScCdpkJsfvRtf1': {
        nome: 'Iara Costa',
        email: 'gerente.ba@exemplo.com',
        role: 'gerencia_regional',
        state: 'BA',
        city: 'Salvador',
        uid: 'placeholder_uid_gerente_ba'
    },
    'Zv1cKrmhbaUGulVFyeiDyK9Boxz1': {
        nome: 'Luana Mendes',
        email: 'comercial.ssa@exemplo.com',
        role: 'comercial',
        state: 'BA',
        city: 'Salvador',
        uid: 'placeholder_uid_comercial_ssa'
    },
    'nuiVwwR7OjbQ3182ORZ4I8FZtKw2': {
        nome: 'Gabriel Santos',
        email: 'comercial.fsa@exemplo.com',
        role: 'comercial',
        state: 'BA',
        city: 'Feira de Santana',
        uid: 'placeholder_uid_comercial_fsa'
    },
    'PCsnW8axcQRXgj6V1J2Ra7qmPwg1': {
        nome: 'Junior Almeida',
        email: 'operacional@exemplo.com',
        role: 'operacional',
        state: 'RJ',
        city: 'Rio de Janeiro',
        uid: 'placeholder_uid_op'
    },
        'J8QGQwKOGaRSmAlRLzaemdHUrWu1': {
        nome: 'Alexandre Almeida',
        email: 'comercial@exemplo.com',
        role: 'comercial',
        state: 'RJ',
        city: 'Rio de Janeiro',
        uid: 'placeholder_uid_op'
    },
      'LCbpKgJiowXmItWMeLPykoNNx222': {
        nome: 'Jaime Pereira',
        email: 'gerencia@exemplo.com',
        role: 'gerencia_regional',
        state: 'BA',
        city: 'Bahia',
        uid: 'placeholder_uid_op'
    },
      'J2nObHEGv0ftMyZYyY24KfTigj43': {
        nome: 'Daiane Souza',
        email: 'superintendencia@exemplo.com',
        role: 'superintendencia',
        state: 'BA',
        city: 'Bahia',
        uid: 'placeholder_uid_op'
    },
};

/**
 * Adiciona os usuários de exemplo ao Firestore.
 * Usa um batch para garantir que todos sejam adicionados em uma única operação.
 */
export async function seedUsersDatabase() {
    console.log('Iniciando o processo de seeding de usuários...');
    const batch = writeBatch(db);

    for (const [uid, userData] of Object.entries(usersToSeed)) {
        console.log(`Adicionando usuário ao batch: ${userData.email} (UID: ${uid})`);
        const userRef = doc(db, 'users', uid);
        batch.set(userRef, userData);
    }

    try {
        await batch.commit();
        console.log('--------------------------------------------------');
        console.log('SUCESSO: Usuários de exemplo adicionados ao banco de dados!');
        console.log('--------------------------------------------------');
        alert('Usuários de exemplo adicionados com sucesso! Você já pode testar a página de usuários.');
    } catch (error) {
        console.error('Erro ao adicionar usuários de exemplo:', error);
        alert(`Erro ao adicionar usuários: ${error.message}`);
    }
}
