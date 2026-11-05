const studentLoginPanel = document.getElementById('studentLoginPanel');
const studentDashboard = document.getElementById('studentDashboard');
const studentAccessStatus = document.getElementById('studentAccessStatus');
const learningPlanTitle = document.getElementById('learningPlanTitle');
const learningPlanDescription = document.getElementById('learningPlanDescription');
const toggleSubscription = document.getElementById('toggleSubscription');
let demoSubscriptionActive = false;

document.getElementById('studentLoginForm').addEventListener('submit', event => {
    event.preventDefault();
    studentLoginPanel.hidden = true;
    studentDashboard.hidden = false;
    document.getElementById('studentDashboardTitle').focus();
});

toggleSubscription.addEventListener('click', () => {
    demoSubscriptionActive = !demoSubscriptionActive;
    studentDashboard.classList.toggle('is-subscribed', demoSubscriptionActive);
    studentAccessStatus.textContent = demoSubscriptionActive
        ? 'Suscripción simulada activa · acceso completo de muestra'
        : 'Acceso básico de muestra';
    learningPlanTitle.textContent = demoSubscriptionActive
        ? 'Biblioteca completa desbloqueada (demo)'
        : 'Comienza con el acceso básico';
    learningPlanDescription.textContent = demoSubscriptionActive
        ? 'En una plataforma real, el acceso completo dependería de una suscripción verificada por el servidor.'
        : 'Explora la lección introductoria. La biblioteca completa se muestra como contenido exclusivo para suscriptores.';
    toggleSubscription.textContent = demoSubscriptionActive
        ? 'Volver al acceso básico'
        : 'Simular suscripción activa';
});

document.getElementById('studentLogout').addEventListener('click', () => {
    demoSubscriptionActive = false;
    studentDashboard.classList.remove('is-subscribed');
    studentDashboard.hidden = true;
    studentLoginPanel.hidden = false;
    document.getElementById('studentLoginForm').reset();
    studentAccessStatus.textContent = 'Acceso básico de muestra';
    learningPlanTitle.textContent = 'Comienza con el acceso básico';
    learningPlanDescription.textContent = 'Explora la lección introductoria. La biblioteca completa se muestra como contenido exclusivo para suscriptores.';
    toggleSubscription.textContent = 'Simular suscripción activa';
    document.getElementById('studentEmail').focus();
});
