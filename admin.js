const sampleOrders = [
    { id: 'DEMO-1041', client: 'Cliente de muestra C', daysUntilDue: -1, profit: 34000, status: 'En producción', category: 'ender5' },
    { id: 'DEMO-1045', client: 'Cliente de muestra A', daysUntilDue: 0, profit: 52000, status: 'En producción', category: 'cr10' },
    { id: 'DEMO-1048', client: 'Cliente de muestra B', daysUntilDue: 1, profit: 86000, status: 'Aprobado', category: 'ender5' },
    { id: 'DEMO-1050', client: 'Cliente de muestra E', daysUntilDue: 2, profit: 0, status: 'Preparación', category: 'partner', supplierQuote: 55000, commissionRate: 20 },
    { id: 'DEMO-1052', client: 'Cliente de muestra D', daysUntilDue: 4, profit: 112000, status: 'Por confirmar', category: 'cr10' }
];

const categories = {
    ender5: 'Ender 5',
    cr10: 'Creality CR-10',
    partner: 'Empresa colaboradora'
};

const printerNames = {
    ender5: 'Ender 5',
    cr10: 'Creality CR-10'
};

const printerStates = {
    ender5: 'available',
    cr10: 'available'
};

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

const getOrderGain = order => order.category === 'partner'
    ? order.supplierQuote * order.commissionRate / 100
    : order.profit;

const tableBody = document.getElementById('ordersTableBody');
const searchInput = document.getElementById('orderSearch');
let sortMode = 'due';
let selectedQueue = 'ender5';
let demoOrderSequence = 1053;

function updateQueueCounts() {
    document.querySelectorAll('[data-queue-count]').forEach(counter => {
        counter.textContent = sampleOrders.filter(order => order.category === counter.dataset.queueCount).length;
    });
}

function updateMetrics() {
    document.getElementById('openOrdersMetric').textContent = sampleOrders.length;
    document.getElementById('urgentOrdersMetric').textContent =
        sampleOrders.filter(order => order.daysUntilDue <= 1).length;
    document.getElementById('profitMetric').textContent =
        formatCLP(sampleOrders.reduce((total, order) => total + getOrderGain(order), 0));
}

function getNewOrderCategory() {
    const availablePrinters = Object.keys(printerNames).filter(printer => printerStates[printer] === 'available');
    if (availablePrinters.length === 0) return 'partner';
    if (availablePrinters.length === 1) return availablePrinters[0];
    return availablePrinters.sort((a, b) =>
        sampleOrders.filter(order => order.category === a).length -
        sampleOrders.filter(order => order.category === b).length
    )[0];
}

function updatePrinterRoutingStatus() {
    const availablePrinters = Object.keys(printerNames).filter(printer => printerStates[printer] === 'available');
    const routingStatus = document.getElementById('automaticRoutingStatus');
    const message = document.getElementById('printerRoutingMessage');

    if (availablePrinters.length === 0) {
        routingStatus.dataset.state = 'partner';
        routingStatus.textContent = 'Derivación automática a colaborador';
        message.textContent = 'Ambas impresoras están ocupadas o fuera de servicio. Los pedidos nuevos se asignarán a la empresa colaboradora; los pedidos ya asignados no se moverán.';
    } else if (availablePrinters.length === 1) {
        routingStatus.dataset.state = 'available';
        routingStatus.textContent = 'Impresión propia disponible';
        message.textContent = `Los pedidos nuevos se asignarán a ${printerNames[availablePrinters[0]]}. Los pedidos ya asignados no se moverán.`;
    } else {
        routingStatus.dataset.state = 'available';
        routingStatus.textContent = 'Impresión propia disponible';
        message.textContent = 'Ambas impresoras están disponibles. Los pedidos nuevos se asignan al equipo con menos pedidos en cola; en caso de empate, se asignan a Ender 5.';
    }
}

function simulateNewOrder() {
    const id = `DEMO-${demoOrderSequence++}`;
    const category = getNewOrderCategory();
    const order = {
        id,
        client: `Cliente de muestra ${id.slice(-4)}`,
        daysUntilDue: 5,
        profit: 0,
        status: 'Nueva solicitud',
        category
    };
    if (category === 'partner') {
        order.supplierQuote = 0;
        order.commissionRate = 20;
    }

    sampleOrders.push(order);
    updateMetrics();
    updateQueueCounts();
    searchInput.value = '';
    setQueue(category);

    const routingMessage = document.getElementById('newOrderRoutingStatus');
    routingMessage.hidden = false;
    routingMessage.textContent = `Pedido ficticio ${id} asignado a ${categories[category]}.`;
}

function createRouteCell(order) {
    const cell = document.createElement('td');
    cell.className = 'route-cell';

    const select = document.createElement('select');
    select.className = 'route-select';
    select.dataset.orderId = order.id;
    select.dataset.orderField = 'category';
    select.setAttribute('aria-label', `Destino de fabricación para ${order.id}`);
    for (const [value, label] of Object.entries(categories)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = order.category === value;
        select.appendChild(option);
    }
    cell.appendChild(select);

    if (order.category === 'partner') {
        const fields = document.createElement('div');
        fields.className = 'partner-fields';

        const quoteLabel = document.createElement('label');
        quoteLabel.textContent = 'Cotización externa (CLP)';
        const quoteInput = document.createElement('input');
        quoteInput.type = 'number';
        quoteInput.min = '0';
        quoteInput.max = '999999999';
        quoteInput.step = '1000';
        quoteInput.value = String(order.supplierQuote);
        quoteInput.dataset.orderId = order.id;
        quoteInput.dataset.orderField = 'supplierQuote';
        quoteInput.setAttribute('aria-label', `Cotización externa para ${order.id}`);
        quoteLabel.appendChild(quoteInput);

        const rateLabel = document.createElement('label');
        rateLabel.textContent = 'Comisión (%)';
        const rateInput = document.createElement('input');
        rateInput.type = 'number';
        rateInput.min = '0';
        rateInput.max = '100';
        rateInput.step = '1';
        rateInput.value = String(order.commissionRate);
        rateInput.dataset.orderId = order.id;
        rateInput.dataset.orderField = 'commissionRate';
        rateInput.setAttribute('aria-label', `Porcentaje de comisión para ${order.id}`);
        rateLabel.appendChild(rateInput);

        fields.append(quoteLabel, rateLabel);
        cell.appendChild(fields);

        const commission = order.supplierQuote * order.commissionRate / 100;
        const summary = document.createElement('div');
        summary.className = 'partner-summary';
        summary.append('Comisión: ');
        const commissionValue = document.createElement('strong');
        commissionValue.className = 'commission-value';
        commissionValue.textContent = formatCLP(commission);
        summary.append(commissionValue, document.createElement('br'), 'Precio sugerido al cliente: ');
        const clientPrice = document.createElement('strong');
        clientPrice.textContent = formatCLP(order.supplierQuote + commission);
        summary.appendChild(clientPrice);
        cell.appendChild(summary);
    }

    return cell;
}

function renderOrders() {
    const query = searchInput.value.trim().toLocaleLowerCase('es-CL');
    const orders = sampleOrders
        .filter(order => order.category === selectedQueue)
        .filter(order => `${order.id} ${order.client} ${categories[order.category]}`.toLocaleLowerCase('es-CL').includes(query))
        .sort((a, b) => sortMode === 'due'
            ? a.daysUntilDue - b.daysUntilDue || getOrderGain(b) - getOrderGain(a)
            : getOrderGain(b) - getOrderGain(a) || a.daysUntilDue - b.daysUntilDue);

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

        const gainCell = document.createElement('td');
        gainCell.className = 'numeric-cell';
        const gainLabel = document.createElement('span');
        gainLabel.className = 'gain-label';
        gainLabel.textContent = order.category === 'partner' ? 'Comisión estimada' : 'Ganancia estimada';
        const gainValue = document.createElement('strong');
        gainValue.textContent = formatCLP(getOrderGain(order));
        gainCell.append(gainLabel, document.createElement('br'), gainValue);

        row.append(orderCell, clientCell, dueCell, statusCell, createRouteCell(order), gainCell);
        tableBody.appendChild(row);
    }

    document.getElementById('emptyOrdersMessage').hidden = orders.length !== 0;
}

function setQueue(queue) {
    if (!Object.hasOwn(categories, queue)) return;
    selectedQueue = queue;
    document.querySelectorAll('[data-queue]').forEach(button => {
        const isSelected = button.dataset.queue === queue;
        button.classList.toggle('is-active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
    });
    renderOrders();
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

function updateAnalyticsStatus() {
    const token = window.CLOUDFLARE_WEB_ANALYTICS_TOKEN;
    const isConfigured = typeof token === 'string' && token.trim() !== '';
    const status = document.getElementById('analyticsStatus');
    status.dataset.configured = String(isConfigured);
    status.textContent = isConfigured ? 'Token público configurado' : 'Pendiente de configuración';
    document.getElementById('analyticsSummary').textContent = isConfigured
        ? 'El sitio está preparado para registrar métricas agregadas de la portada y la calculadora. Los informes pueden tardar unos minutos en aparecer y se consultan en Cloudflare.'
        : 'Aún no se registran visitas. Configura el token público de Cloudflare Web Analytics para consultar visitas y páginas más vistas en sus informes.';
}

function updateOrderField(event) {
    const field = event.target.dataset.orderField;
    const order = sampleOrders.find(item => item.id === event.target.dataset.orderId);
    if (!order) return;

    if (field === 'category' && Object.hasOwn(categories, event.target.value)) {
        order.category = event.target.value;
        if (order.category === 'partner') {
            order.supplierQuote ??= 0;
            order.commissionRate ??= 20;
        }
        updateQueueCounts();
        updateMetrics();
        setQueue(order.category);
        tableBody.querySelector(`[data-order-id="${order.id}"][data-order-field="category"]`)?.focus();
        return;
    }

    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    if (field === 'supplierQuote') {
        order.supplierQuote = Math.min(999999999, Math.max(0, value));
    } else if (field === 'commissionRate') {
        order.commissionRate = Math.min(100, Math.max(0, value));
    } else {
        return;
    }

    updateMetrics();
    renderOrders();
    tableBody.querySelector(`[data-order-id="${order.id}"][data-order-field="${field}"]`)?.focus();
}

const courseVideoForm = document.getElementById('courseVideoForm');
const courseVideoList = document.getElementById('courseVideoList');
const emptyCourseVideos = document.getElementById('emptyCourseVideos');
const courseVideoStatus = document.getElementById('courseVideoStatus');
const demoVideoUrls = new Set();
const maxDemoVideoSize = 200 * 1024 * 1024;

function clearDemoVideos() {
    demoVideoUrls.forEach(url => URL.revokeObjectURL(url));
    demoVideoUrls.clear();
    courseVideoList.querySelectorAll('.course-video-item').forEach(item => item.remove());
    emptyCourseVideos.hidden = false;
    courseVideoStatus.textContent = '';
    delete courseVideoStatus.dataset.state;
}

function addDemoVideo(event) {
    event.preventDefault();
    const title = document.getElementById('courseVideoTitle').value.trim();
    const access = document.getElementById('courseVideoAccess').value;
    const file = document.getElementById('courseVideoFile').files[0];

    if (!title || !file) {
        courseVideoStatus.dataset.state = 'error';
        courseVideoStatus.textContent = 'Completa el título y selecciona un archivo de video.';
        return;
    }
    if (!file.type.startsWith('video/')) {
        courseVideoStatus.dataset.state = 'error';
        courseVideoStatus.textContent = 'El archivo seleccionado no parece ser un video compatible.';
        return;
    }
    if (file.size > maxDemoVideoSize) {
        courseVideoStatus.dataset.state = 'error';
        courseVideoStatus.textContent = 'El video supera el límite de 200 MB para esta demostración.';
        return;
    }

    const url = URL.createObjectURL(file);
    demoVideoUrls.add(url);

    const item = document.createElement('article');
    item.className = 'course-video-item';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const accessLabel = document.createElement('p');
    accessLabel.textContent = access === 'subscriber' ? 'Acceso de muestra: suscriptores' : 'Acceso de muestra: básico';
    const preview = document.createElement('video');
    preview.controls = true;
    preview.preload = 'metadata';
    preview.src = url;
    preview.setAttribute('aria-label', `Vista previa del video ${title}`);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Quitar de la vista previa';
    removeButton.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        demoVideoUrls.delete(url);
        item.remove();
        emptyCourseVideos.hidden = courseVideoList.querySelectorAll('.course-video-item').length !== 0;
        courseVideoStatus.dataset.state = 'success';
        courseVideoStatus.textContent = 'Video quitado de esta demostración.';
    });

    item.append(heading, accessLabel, preview, removeButton);
    courseVideoList.appendChild(item);
    emptyCourseVideos.hidden = true;
    courseVideoStatus.dataset.state = 'success';
    courseVideoStatus.textContent = 'Video agregado a la vista previa local. No se subió ni se compartió.';
    courseVideoForm.reset();
}

document.getElementById('demoLoginForm').addEventListener('submit', event => {
    event.preventDefault();
    document.getElementById('loginPanel').hidden = true;
    document.getElementById('dashboardPanel').hidden = false;
    updateAnalyticsStatus();
    updateMetrics();
    updateQueueCounts();
    updatePrinterRoutingStatus();
    setQueue(selectedQueue);
    document.getElementById('dashboardTitle').focus();
});

document.getElementById('logoutButton').addEventListener('click', () => {
    clearDemoVideos();
    document.getElementById('dashboardPanel').hidden = true;
    document.getElementById('loginPanel').hidden = false;
    document.getElementById('demoLoginForm').reset();
    searchInput.value = '';
    setSortMode('due');
    setQueue('ender5');
    document.getElementById('demoUser').focus();
});

document.querySelectorAll('[data-queue]').forEach(button => {
    button.addEventListener('click', () => setQueue(button.dataset.queue));
});
document.getElementById('sortDueButton').addEventListener('click', () => setSortMode('due'));
document.getElementById('sortProfitButton').addEventListener('click', () => setSortMode('profit'));
document.querySelectorAll('[data-printer-state]').forEach(select => {
    select.addEventListener('change', () => {
        printerStates[select.dataset.printerState] = select.value;
        updatePrinterRoutingStatus();
    });
});
document.getElementById('simulateOrderButton').addEventListener('click', simulateNewOrder);
courseVideoForm.addEventListener('submit', addDemoVideo);
tableBody.addEventListener('change', updateOrderField);
searchInput.addEventListener('input', renderOrders);
