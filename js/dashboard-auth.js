import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeDashboard } from './dashboard.js';

const auth = getAuth(app);

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        getIdTokenResult(user).then((idTokenResult) => {
            const role = idTokenResult.claims.role || 'comercial'; // Default to 'comercial' if no role
            console.log(`User role: ${role}`);
            initializeDashboard(user.uid, role); // Pass UID and role
        });
    } else {
        // User is signed out, redirect to login
        window.location.href = 'index.html';
    }
});

// Logout
const logoutButton = document.getElementById('logout-button');
if(logoutButton) {
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            console.log('User signed out');
        }).catch((error) => {
            console.error('Sign out error', error);
        });
    });
}
