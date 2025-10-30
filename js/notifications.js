import { getCurrentUser } from './auth-manager.js';
import { getNotifications, markNotificationAsRead } from './firestore-service.js';
import { handleError } from './error-handler.js';

// This script runs on all pages where it is included.
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (user) {
        initializeNotifications(user.uid);
    }
});

function initializeNotifications(userId) {
    console.log("Initializing notifications for userId:", userId);
    const notificationBell = document.getElementById('notification-bell');
    if (!notificationBell) return; // Do nothing if the bell is not on the page

    getNotifications(userId, (notifications) => {
        updateNotificationUI(notifications);
    });
}

function updateNotificationUI(notifications) {
    const countElement = document.getElementById('notification-count');
    const dropdownElement = document.getElementById('notification-dropdown');

    if (!countElement || !dropdownElement) return;

    const unreadNotifications = notifications.filter(n => !n.isRead);

    // Update count badge
    if (unreadNotifications.length > 0) {
        countElement.textContent = unreadNotifications.length;
        countElement.style.display = 'block';
    } else {
        countElement.style.display = 'none';
    }

    // Update dropdown
    dropdownElement.innerHTML = ''; // Clear previous items
    if (notifications.length === 0) {
        dropdownElement.innerHTML = '<li><div class="text-center p-2">Nenhuma notificação</div></li>';
    } else {
        notifications.forEach(notification => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.className = `dropdown-item notification-item ${notification.isRead ? 'read' : 'fw-bold'}`;
            link.href = '#';
            link.dataset.id = notification.id;
            link.dataset.link = notification.link;
            
            link.innerHTML = `
                <div class="small text-muted">${new Date(notification.timestamp.seconds * 1000).toLocaleString('pt-BR')}</div>
                ${notification.message}
            `;

            link.addEventListener('click', handleNotificationClick);
            
            listItem.appendChild(link);
            dropdownElement.appendChild(listItem);
        });
    }
}

async function handleNotificationClick(event) {
    event.preventDefault();
    const notificationId = event.currentTarget.dataset.id;
    const redirectLink = event.currentTarget.dataset.link;

    try {
        await markNotificationAsRead(notificationId);
        // The listener in initializeNotifications will handle the UI update automatically.
        // Now, redirect.
        if (redirectLink) {
            window.location.href = redirectLink;
        }
    } catch (error) {
        handleError(error, 'Marking notification as read');
    }
}
