/**
 * A centralized error handler for the application.
 * @param {Error} error - The error object.
 * @param {string} [context] - An optional context message to help with debugging.
 */
export function handleError(error, context) {
    console.error(context ? `Error in ${context}:` : 'An error occurred:', error);

    // For now, we'll use a simple alert. This can be replaced with a more
    // sophisticated UI component like a modal or a toast notification.
    let userMessage = 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';

    if (error.code) {
        switch (error.code) {
            case 'permission-denied':
                userMessage = 'Você não tem permissão para realizar esta ação.';
                break;
            case 'unauthenticated':
                userMessage = 'Você precisa estar autenticado para realizar esta ação.';
                break;
            // Add more specific Firebase error codes here as needed
            default:
                userMessage = `Erro: ${error.message}`;
        }
    }

    alert(userMessage);
}
