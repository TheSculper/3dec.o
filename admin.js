const sampleOrders = [
    { id: 'DEMO-1041', client: 'Cliente de muestra C', daysUntilDue: -1, profit: 34000, status: 'En producción' },
    { id: 'DEMO-1045', client: 'Cliente de muestra A', daysUntilDue: 0, profit: 52000, status: 'En producción' },
    { id: 'DEMO-1048', client: 'Cliente de muestra B', daysUntilDue: 1, profit: 86000, status: 'Aprobado' },
    { id: 'DEMO-1050', client: 'Cliente de muestra E', daysUntilDue: 2, profit: 65000, status: 'Preparación' },
    { id: 'DEMO-1052', client: 'Cliente de muestra D', daysUntilDue: 4, profit: 112000, status: 'Por confirmar' }
];

const demoDate = offset => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
};

const formatCLP = value => '$' + Math.round(value).toLocaleString('es-CL') + ' CLP';

const formatDueDate = daysUntilDue => {
    const date = demoDate(daysUntilDue);
    const label = new Intl.DateTimeFormat('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
    if (daysUntilDue < 0) return `Vencido · ${label}`;
    if (daysUntilDue === 0) return `Hoy · ${label}`;
    if (daysUntilDue === 1) return `Mañana · ${label}`;
    return label;
};

const getStatusClass = status => {
    if (status === 'En producción' || status === 'Aprobado') return 'status-production';
    if (status === 'Por confirmar') return 'status-confirmation';
    if (status === 'Listo') return 'status-ready';
    return '';
};

const tableBody = document.getElementById('ordersTableBody');
const searchInput = document.getElementById('orderSearch');
let sortMode = 'due';

function renderOrders() {
    const query = searchInput.value.trim().toLocaleLowerCase('es-CL');
    const orders = sampleOrders
        .filter(order => `${order.id} ${order.client}`.toLocaleLowerCase('es-CL').includes(query))
        .sort((a, b) => sortMode === 'due'
            ? a.daysUntilDue - b.daysUntilDue || b.profit - a.profit
            : b.profit - a.profit || a.daysUntilDue - b.daysUntilDue);

    tableBody.replaceChildren();
    for (const order of orders) {
        const row = document.createElement('tr');
        const orderCell = document.createElement('td');
        const orderNumber = document.createElement('span');
        orderNumber.className = 'order-number';
        orderNumber.textContent = order.id;
        orderCell.appendChild(orderNumber);

        const clientCell = document.createElement('td');
        const clientName = document.createElement('span');
        clientName.className = 'client-name';
        clientName.textContent = order.client;
        clientCell.appendChild(clientName);

        const dueCell = document.createElement('td');
        const dueDate = document.createElement('span');
        dueDate.className = order.daysUntilDue <= 1 ? 'date-cell date-alert' : 'date-cell';
        dueDate.textContent = formatDueDate(order.daysUntilDue);
        dueCell.appendChild(dueDate);

        const statusCell = document.createElement('td');
        const status = document.createElement('span');
        status.className = `status-pill ${getStatusClass(order.status)}`.trim();
        status.textContent = order.status;
        statusCell.appendChild(status);

        const profitCell = document.createElement('td');
        profitCell.className = 'numeric-cell';
        profitCell.textContent = formatCLP(order.profit);

        row.append(orderCell, clientCell, dueCell, statusCell, profitCell);
        tableBody.appendChild(row);
    }

    document.getElementById('emptyOrdersMessage').hidden = orders.length !== 0;
}

function setSortMode(mode) {
    sortMode = mode;
    const dueButton = document.getElementById('sortDueButton');
    const profitButton = document.getElementById('sortProfitButton');
    dueButton.classList.toggle('is-active', mode === 'due');
    profitButton.classList.toggle('is-active', mode === 'profit');
    dueButton.setAttribute('aria-pressed', String(mode === 'due'));
    profitButton.setAttribute('aria-pressed', String(mode === 'profit'));
    renderOrders();
}

document.getElementById('demoLoginForm').addEventListener('submit', event => {
    event.preventDefault();
    document.getElementById('loginPanel').hidden = true;
    document.getElementById('dashboardPanel').hidden = false;
    document.getElementById('openOrdersMetric').textContent = sampleOrders.length;
    document.getElementById('urgentOrdersMetric').textContent =
        sampleOrders.filter(order => order.daysUntilDue <= 1).length;
    document.getElementById('profitMetric').textContent =
        formatCLP(sampleOrders.reduce((total, order) => total + order.profit, 0));
    renderOrders();
    document.getElementById('dashboardTitle').focus();
});

document.getElementById('logoutButton').addEventListener('click', () => {
    document.getElementById('dashboardPanel').hidden = true;
    document.getElementById('loginPanel').hidden = false;
    document.getElementById('demoLoginForm').reset();
    searchInput.value = '';
    setSortMode('due');
    document.getElementById('demoUser').focus();
});

document.getElementById('sortDueButton').addEventListener('click', () => setSortMode('due'));
document.getElementById('sortProfitButton').addEventListener('click', () => setSortMode('profit'));
searchInput.addEventListener('input', renderOrders);
