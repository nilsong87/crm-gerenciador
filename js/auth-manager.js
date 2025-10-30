import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, getIdTokenResult, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUser } from './firestore-service.js';
import { handleError } from './error-handler.js';

const auth = getAuth(app);

// Tenta obter o usuário do sessionStorage primeiro para um carregamento mais rápido
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let authPromise = null; // To hold the promise that resolves when auth is ready

onAuthStateChanged(auth, async (user) => {
    // This block will run whenever the auth state changes (login, logout, initial load)
    if (user) {
        // User is logged in. Fetch their custom claims and Firestore data.
        try {
            const idTokenResult = await user.getIdTokenResult(true); // Force refresh token to get latest claims
            const role = idTokenResult.claims.role || 'comercial';
            const userData = await getUser(user.uid); // Fetch user data from Firestore

            currentUser = {
                uid: user.uid,
                email: user.email,
                role: role,
                ...userData
            };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (error) {
            handleError(error, 'Failed to load user data after auth state change');
            currentUser = null;
            sessionStorage.removeItem('currentUser');
        }
    } else {
        // User is logged out
        currentUser = null;
        sessionStorage.removeItem('currentUser');
        if (!window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
    }

    // Resolve any pending authPromise
    if (authPromise) {
        authPromise.resolve(currentUser);
        authPromise = null; // Clear the promise
    }
});

export function onAuth() {
    // If authPromise already exists, return its promise
    if (authPromise) {
        return authPromise.promise;
    }

    // If currentUser is already set (from sessionStorage or a previous auth state change),
    // resolve immediately with it.
    if (currentUser !== null) {
        return Promise.resolve(currentUser);
    }

    // If neither of the above, create a new authPromise and return it.
    // The onAuthStateChanged listener will resolve this promise once auth state is determined.
    authPromise = {};
    authPromise.promise = new Promise(resolve => {
        authPromise.resolve = resolve;
    });
    return authPromise.promise;
}

export function getCurrentUser() {
    return currentUser;
}

export function logout() {
    return signOut(auth);
}

/**
 * Impõe o acesso baseado em perfil a uma página.
 * @param {string[]} allowedRoles - Um array de perfis que têm permissão para acessar a página.
 */
export async function enforceRoleAccess(allowedRoles) {
    const user = await onAuth(); // Await the fully resolved user object
    if (user && !allowedRoles.includes(user.role)) {
        console.error(`Acesso Negado: Usuário com perfil '${user.role}' tentou acessar uma página restrita.`);
        alert('Você não tem permissão para acessar esta página.');
        window.location.href = 'dashboard.html';
    }
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