import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, getIdTokenResult, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUser } from './firestore-service.js';
import { handleError } from './error-handler.js';

const auth = getAuth(app);

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            const idTokenResult = await getIdTokenResult(user);
            const role = idTokenResult.claims.role || 'comercial';
            const userData = await getUser(user.uid);
            
            currentUser = {
                uid: user.uid,
                email: user.email,
                role: role,
                state: userData ? userData.state : null,
                city: userData ? userData.city : null,
                ...userData
            };
        } else {
            currentUser = null;
            // If on a protected page, redirect to login
            if (!window.location.pathname.endsWith('index.html')) {
                window.location.href = 'index.html';
            }
        }
        
        if (authReadyCallback) {
            authReadyCallback(currentUser);
        }
    } catch (error) {
        handleError(error, 'Authentication state change');
    }
});

let authReadyCallback = null;

export function onAuth(callback) {
    // If user is already available, call back immediately
    if (currentUser) {
        callback(currentUser);
    } 
    // Otherwise, queue the callback to be called when auth state is resolved
    else {
        authReadyCallback = callback;
    }
}

export function getCurrentUser() {
    return currentUser;
}

export function logout() {
    return signOut(auth);
}

/**
 * Enforces role-based access to a page.
 * @param {string[]} allowedRoles - An array of roles that are allowed to access the page.
 */
export function enforceRoleAccess(allowedRoles) {
    onAuth(user => {
        if (user && !allowedRoles.includes(user.role)) {
            console.error(`Access Denied: User with role '${user.role}' tried to access a restricted page.`);
            alert('Você não tem permissão para acessar esta página.');
            // Redirect to a safe page, like the dashboard.
            window.location.href = 'dashboard.html';
        }
    });
}

/**
 * Checks if the current user has one of the specified roles.
 * @param {string[]} roles - An array of roles to check against.
 * @returns {boolean} - True if the user has one of the roles, false otherwise.
 */
export function userHasRole(roles) {
    const user = getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
}


// Logout button event listener
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    if(logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout().then(() => {
                console.log('User signed out');
                window.location.href = 'index.html';
            }).catch((error) => {
                handleError(error, 'Logout');
            });
        });
    }
});