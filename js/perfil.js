import { getCurrentUser } from './auth-manager.js';
import { updateUserName } from './firestore-service.js';
import { getAuth, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { handleError } from './error-handler.js';

// Called from perfil.html after auth state is confirmed
export function initializeProfilePage() {
    try {
        const user = getCurrentUser();
        if (!user) return;

        document.getElementById('profile-name').value = user.nome || '';
        document.getElementById('profile-email').value = user.email || '';

        const profileForm = document.getElementById('profile-form');
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('profile-name').value;
            if (newName !== user.nome) {
                try {
                    await updateUserName(user.uid, newName);
                    alert('Nome atualizado com sucesso!');
                } catch (error) {
                    handleError(error, 'Update Profile Name');
                }
            }
        });

        const passwordForm = document.getElementById('password-form');
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert('As senhas não coincidem.');
                return;
            }

            try {
                const auth = getAuth();
                await updatePassword(auth.currentUser, newPassword);
                alert('Senha alterada com sucesso!');
                passwordForm.reset();
            } catch (error) {
                handleError(error, 'Update Password');
            }
        });
    } catch (error) {
        handleError(error, 'Initialize Profile Page');
    }
}