import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firestore-service.js';
import { getCurrentUser } from './auth-manager.js';
import { handleError } from './error-handler.js';

const logsCollection = collection(db, 'audit_logs');

/**
 * Records an action in the audit log.
 * @param {string} action - A descriptive name for the action (e.g., 'user.role.changed').
 * @param {object} details - An object containing relevant details about the action.
 */
export async function logAction(action, details = {}) {
    try {
        const actor = getCurrentUser();
        if (!actor) {
            console.error('Audit Log Error: Cannot log action without a current user.');
            return;
        }

        const logEntry = {
            actor: {
                uid: actor.uid,
                email: actor.email,
                role: actor.role
            },
            action,
            details,
            timestamp: serverTimestamp() // Uses the server's time for accuracy and security
        };

        await addDoc(logsCollection, logEntry);

    } catch (error) {
        // We log the error to the console but don't interrupt the user's flow.
        handleError(error, 'Audit Log Service');
    }
}
