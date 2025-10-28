import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, getIdTokenResult, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUser } from './firestore-service.js';
import { handleError } from './error-handler.js';

const auth = getAuth(app);

// Tenta obter o usuário do sessionStorage primeiro para um carregamento mais rápido
let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            // Se o usuário estiver autenticado, mas não tivermos seus dados (primeiro carregamento), busque-os
            if (!currentUser || currentUser.uid !== user.uid) {
                const idTokenResult = await getIdTokenResult(user);
                const role = idTokenResult.claims.role || 'comercial';
                const userData = await getUser(user.uid);
                
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    role: role,
                    ...userData
                };

                // Armazena os dados do usuário no sessionStorage
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } else {
            // O usuário está deslogado
            currentUser = null;
            // Limpa os dados do usuário do sessionStorage
            sessionStorage.removeItem('currentUser');
            
            // Se estiver em uma página protegida, redireciona para o login
            if (!window.location.pathname.endsWith('index.html')) {
                window.location.href = 'index.html';
            }
        }
        
        // Este callback é crucial para que as páginas reajam assim que a autenticação for confirmada
        if (authReadyCallback) {
            authReadyCallback(currentUser);
        }
    } catch (error) {
        handleError(error, 'Authentication state change');
        // Limpa dados em cache potencialmente corrompidos
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        if (authReadyCallback) {
            authReadyCallback(null);
        }
    }
});

let authReadyCallback = null;

export function onAuth(callback) {
    // Se o usuário já estiver disponível (do cache ou da verificação de auth), chama o callback imediatamente
    if (currentUser) {
        return callback(currentUser);
    } 
    // Caso contrário, enfileira o callback para ser chamado quando o estado de autenticação for resolvido
    else {
        authReadyCallback = callback;
    }
}

export function getCurrentUser() {
    // Retorna da memória, que foi preenchida pelo cache ou pela mudança de autenticação
    return currentUser;
}

export function logout() {
    // O listener onAuthStateChanged cuidará da limpeza do sessionStorage e do redirecionamento
    return signOut(auth);
}

/**
 * Impõe o acesso baseado em perfil a uma página.
 * @param {string[]} allowedRoles - Um array de perfis que têm permissão para acessar a página.
 */
export function enforceRoleAccess(allowedRoles) {
    onAuth(user => {
        if (user && !allowedRoles.includes(user.role)) {
            console.error(`Acesso Negado: Usuário com perfil '${user.role}' tentou acessar uma página restrita.`);
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = 'dashboard.html';
        }
    });
}

/**
 * Verifica se o usuário atual possui um dos perfis especificados.
 * @param {string[]} roles - Um array de perfis para verificar.
 * @returns {boolean} - True se o usuário tiver um dos perfis, senão false.
 */
export function userHasRole(roles) {
    const user = getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
}


// Listener para o botão de logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    if(logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout().catch((error) => {
                handleError(error, 'Logout');
            });
        });
    }
});