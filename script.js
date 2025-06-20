// --- HAMBURGER MENU LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.querySelector('nav ul');

    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            const isActive = navList.classList.toggle('menu-active');
            menuToggle.classList.toggle('open', isActive);
            menuToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });

        // Cierra el menú solo en móvil/tablet al hacer clic en un enlace
        navList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                // Verificar si el menú está abierto y si el viewport es móvil
                if (navList.classList.contains('menu-active') && window.innerWidth <= 768) {
                    navList.classList.remove('menu-active');
                    menuToggle.classList.remove('open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }
});

// --- CONFIGURATION DATA (Adjust these values to your actual costs) ---
const MATERIAL_DATA = {
    'PLA': {
        '17_PLA': { baseCost: 17, colors: ['Negro', 'Blanco', 'Gris', 'Azul'] },
        '20_PLA': { baseCost: 20, colors: ['Rojo brillante', 'Verde limón', 'Naranja'] }
    },
    'PETG': {
        '23_PETG': { baseCost: 23, colors: ['Transparente', 'Blanco', 'Negro'] }
    },
    'ABS': {
        '25_ABS': { baseCost: 25, colors: ['Negro', 'Blanco'] }
    },
    'TPU': {
        '30_TPU': { baseCost: 30, colors: ['Negro', 'Rojo'] }
    }
};

// --- CALCULATOR LOGIC ---

// Cache DOM elements for better performance and readability
// Asegúrate de que estos IDs existan en tu archivo calculo.html
const DOMElements = {
    materialSelect: document.getElementById('materialSelect'),
    colorSelect: document.getElementById('colorSelect'),
    pesoInput: document.getElementById('pesoInput'),
    tiempoInput: document.getElementById('tiempoInput'),
    postProcesadoInput: document.getElementById('postProcesadoInput'),
    largoInput: document.getElementById('largoInput'),
    anchoInput: document.getElementById('anchoInput'),
    altoInput: document.getElementById('altoInput'),
    costoMaterialBaseSpan: document.getElementById('costoMaterialBase'),
    costoMaterialSoporteSpan: document.getElementById('costoMaterialSoporte'),
    costoMaquinaSpan: document.getElementById('costoMaquina'),
    costoPostProcesadoSpan: document.getElementById('costoPostProcesado'),
    costoEmpaqueSpan: document.getElementById('costoEmpaque'),
    subtotalInicialSpan: document.getElementById('subtotalInicial'),
    ajusteFalloSpan: document.getElementById('ajusteFallo'),
    margenGananciaSpan: document.getElementById('margenGanancia'),
    costoTotalSpan: document.getElementById('costoTotal'),
    enviarWhatsAppBtn: document.getElementById('enviarWhatsAppBtn'),
    calculoForm: document.getElementById('calculoForm'),
    errorMessagesDiv: document.getElementById('errorMessages') // Nuevo div para mensajes de error
};

// Costos fijos (pueden ser variables CSS o configuraciones aquí)
const COSTO_FIJO_EMPAQUE = 2.00; // Costo fijo de empaque
const FACTOR_AJUSTE_FALLO = 0.05; // 5% de ajuste por posibles fallos
const MARGEN_GANANCIA = 0.35; // 35% de margen de ganancia

// Función para actualizar las opciones de color según el material seleccionado
function actualizarOpcionesColor() {
    // Solo ejecutar si el elemento materialSelect existe (estamos en la página de la calculadora)
    if (!DOMElements.materialSelect) return;

    const selectedMaterialType = DOMElements.materialSelect.value;
    const materialOptions = MATERIAL_DATA[selectedMaterialType];

    // Limpiar opciones de color existentes
    DOMElements.colorSelect.innerHTML = '<option value="">Seleccione un color</option>';
    DOMElements.colorSelect.disabled = true; // Desactivar hasta que se seleccione un material con colores

    if (materialOptions) {
        // Recopilar todos los colores disponibles para el tipo de material seleccionado
        const allColors = new Set();
        for (const key in materialOptions) {
            if (materialOptions.hasOwnProperty(key)) {
                materialOptions[key].colors.forEach(color => allColors.add(color));
            }
        }

        // Añadir opciones de color al select
        if (allColors.size > 0) {
            allColors.forEach(color => {
                const option = document.createElement('option');
                option.value = color;
                option.textContent = color;
                DOMElements.colorSelect.appendChild(option);
            });
            DOMElements.colorSelect.disabled = false; // Activar el select de color
        }
    }
    // Después de actualizar los colores, recalcula el costo
    calculateAndDisplayCost();
}

// Función para resetear los valores mostrados y ocultar el botón de WhatsApp
function resetCostDisplay() {
    // Solo ejecutar si los elementos de costo existen (estamos en la página de la calculadora)
    if (!DOMElements.costoTotalSpan) return;

    DOMElements.costoMaterialBaseSpan.textContent = '0.00';
    DOMElements.costoMaterialSoporteSpan.textContent = '0.00';
    DOMElements.costoMaquinaSpan.textContent = '0.00';
    DOMElements.costoPostProcesadoSpan.textContent = '0.00';
    DOMElements.costoEmpaqueSpan.textContent = '0.00';
    DOMElements.subtotalInicialSpan.textContent = '0.00';
    DOMElements.ajusteFalloSpan.textContent = '0.00';
    DOMElements.margenGananciaSpan.textContent = '0.00';
    DOMElements.costoTotalSpan.textContent = '0.00';
    DOMElements.enviarWhatsAppBtn.style.display = 'none';
    DOMElements.errorMessagesDiv.innerHTML = ''; // Limpiar mensajes de error
}

// Función principal para calcular y mostrar el costo
function calculateAndDisplayCost() {
    // Solo ejecutar si los elementos de entrada existen (estamos en la página de la calculadora)
    if (!DOMElements.materialSelect) return;

    resetCostDisplay(); // Resetear antes de cada nuevo cálculo

    const selectedMaterialType = DOMElements.materialSelect.value;
    // La opción seleccionada del material es el value del <option>, que contiene "COSTO_TIPO"
    const selectedMaterialOptionValue = DOMElements.materialSelect.options[DOMElements.materialSelect.selectedIndex]?.value;
    const selectedColor = DOMElements.colorSelect.value;

    const peso = parseFloat(DOMElements.pesoInput.value);
    const tiempo = parseFloat(DOMElements.tiempoInput.value);
    const postProcesado = parseFloat(DOMElements.postProcesadoInput.value);
    const largo = parseFloat(DOMElements.largoInput.value);
    const ancho = parseFloat(DOMElements.anchoInput.value);
    const alto = parseFloat(DOMElements.altoInput.value);

    let errors = [];

    // --- Validaciones de entrada ---
    if (!selectedMaterialType || selectedMaterialType === "") {
        errors.push('Por favor, selecciona un tipo de material.');
    }
    if (DOMElements.colorSelect.disabled === false && (!selectedColor || selectedColor === "")) {
        errors.push('Por favor, selecciona un color.');
    }
    if (isNaN(peso) || peso <= 0) errors.push('El peso debe ser un número positivo.');
    if (isNaN(tiempo) || tiempo <= 0) errors.push('El tiempo de impresión debe ser un número positivo (en horas).');
    if (isNaN(postProcesado) || postProcesado < 0) errors.push('El tiempo de post-procesado debe ser un número positivo o cero (en horas).');
    if (isNaN(largo) || largo <= 0 || isNaN(ancho) || ancho <= 0 || isNaN(alto) || alto <= 0) {
        errors.push('Las dimensiones (largo, ancho, alto) deben ser números positivos.');
    }

    if (errors.length > 0) {
        DOMElements.errorMessagesDiv.innerHTML = errors.map(msg => `<p>${msg}</p>`).join('');
        return; // Detener la ejecución si hay errores
    }

    // Obtener el costo base del material desde la opción seleccionada
    // Asumimos que el formato es 'COSTO_TIPO_MATERIAL', por ejemplo '17_PLA'
    const materialCostValue = selectedMaterialOptionValue.split('_')[0];
    const materialCostPerGram = parseFloat(materialCostValue);

    // Asegurarse de que el costo por gramo es un número válido
    if (isNaN(materialCostPerGram) || materialCostPerGram <= 0) {
        errors.push('Error: No se pudo obtener un costo válido para el material seleccionado.');
        DOMElements.errorMessagesDiv.innerHTML = errors.map(msg => `<p>${msg}</p>`).join('');
        return;
    }

    // --- Cálculos ---
    const costoMaterialBase = peso * materialCostPerGram;
    // Se asume un 10% del peso para el soporte, con el mismo costo por gramo
    const costoMaterialSoporte = (peso * 0.10) * materialCostPerGram;
    // Costo de máquina: 3 euros/hora
    const costoMaquina = tiempo * 3;
    // Costo post-procesado: 10 euros/hora
    const costoPostProcesado = postProcesado * 10;
    const costoEmpaque = COSTO_FIJO_EMPAQUE; // Costo fijo de empaque

    const subtotalInicial = costoMaterialBase + costoMaterialSoporte + costoMaquina + costoPostProcesado + costoEmpaque;
    const ajusteFallo = subtotalInicial * FACTOR_AJUSTE_FALLO;
    const subtotalConAjuste = subtotalInicial + ajusteFallo;
    const margenGanancia = subtotalConAjuste * MARGEN_GANANCIA;
    const costoTotal = subtotalConAjuste + margenGanancia;

    // --- Mostrar resultados ---
    DOMElements.costoMaterialBaseSpan.textContent = costoMaterialBase.toFixed(2);
    DOMElements.costoMaterialSoporteSpan.textContent = costoMaterialSoporte.toFixed(2);
    DOMElements.costoMaquinaSpan.textContent = costoMaquina.toFixed(2);
    DOMElements.costoPostProcesadoSpan.textContent = costoPostProcesado.toFixed(2);
    DOMElements.costoEmpaqueSpan.textContent = costoEmpaque.toFixed(2);
    DOMElements.subtotalInicialSpan.textContent = subtotalInicial.toFixed(2);
    DOMElements.ajusteFalloSpan.textContent = ajusteFallo.toFixed(2);
    DOMElements.margenGananciaSpan.textContent = margenGanancia.toFixed(2);
    DOMElements.costoTotalSpan.textContent = costoTotal.toFixed(2);

    // Mostrar botón de WhatsApp y configurar mensaje
    DOMElements.enviarWhatsAppBtn.style.display = 'block';
    DOMElements.enviarWhatsAppBtn.onclick = () => {
        const mensajeWhatsApp = `
¡Hola 3deco! Me gustaría solicitar una impresión 3D con los siguientes detalles:

Material: ${selectedMaterialType} - ${selectedColor}
Peso (gr): ${peso}
Tiempo de impresión (horas): ${tiempo}
Tiempo de post-procesado (horas): ${postProcesado}
Dimensiones (mm): ${largo}x${ancho}x${alto}

Costo Estimado: ${costoTotal.toFixed(2)} €

Por favor, adjunta tu archivo STL en el chat de WhatsApp. ¡Gracias!
        `;
        window.open(`https://wa.me/34685002931?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank');
        alert("Recuerda adjuntar tu archivo STL directamente en el chat de WhatsApp después de abrirlo.");
    };
}

// --- Event Listeners for Calculator (only add if elements exist on the page) ---
if (DOMElements.calculoForm) { // Check if we are on the calculator page
    DOMElements.materialSelect.addEventListener('change', actualizarOpcionesColor);
    DOMElements.colorSelect.addEventListener('change', calculateAndDisplayCost);
    DOMElements.pesoInput.addEventListener('input', calculateAndDisplayCost);
    DOMElements.tiempoInput.addEventListener('input', calculateAndDisplayCost);
    DOMElements.postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
    DOMElements.largoInput.addEventListener('input', calculateAndDisplayCost);
    DOMElements.anchoInput.addEventListener('input', calculateAndDisplayCost);
    DOMElements.altoInput.addEventListener('input', calculateAndDisplayCost);

    // Prevenir el envío del formulario (que recargaría la página)
    DOMElements.calculoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        calculateAndDisplayCost();
    });

    // Inicializar la calculadora y las opciones de color cuando la página carga
    document.addEventListener('DOMContentLoaded', () => {
        actualizarOpcionesColor(); // Esto también disparará el cálculo inicial
    });
}


// --- FOOTER VISIBILITY LOGIC (existing logic) ---
let isMobile = window.innerWidth <= 768; // Initialize mobile state

function toggleFooterOnScroll() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    if (isMobile) {
        // ¿Estamos al fondo?
        const scrollBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 1;
        if (scrollBottom) {
            footer.classList.add('visible-footer');
        } else {
            footer.classList.remove('visible-footer');
        }
    } else {
        // En escritorio, mostrar siempre el footer
        footer.classList.add('visible-footer');
    }
}

// Update mobile state on resize and re-evaluate footer
window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    // Only re-evaluate footer if mobile state changed or if it's already mobile
    if (wasMobile !== isMobile || isMobile) {
        toggleFooterOnScroll();
    }
});

// Event listeners for footer visibility
window.addEventListener('scroll', toggleFooterOnScroll);
document.addEventListener('DOMContentLoaded', toggleFooterOnScroll); // Initial check on load


// --- HEADER VISIBILITY LOGIC FOR MOBILE (NEW) ---
const header = document.querySelector('header'); // Get the header element
const SCROLL_THRESHOLD = 50; // Pixels to scroll down before hiding header elements

function toggleHeaderElementsVisibility() {
    // Only apply this logic for mobile devices
    if (window.innerWidth <= 768) {
        if (window.scrollY > SCROLL_THRESHOLD) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    } else {
        // Ensure the class is removed on desktop if it somehow got applied
        header.classList.remove('header-scrolled');
    }
}

// Event listeners for header elements visibility
window.addEventListener('scroll', toggleHeaderElementsVisibility);
window.addEventListener('resize', toggleHeaderElementsVisibility); // Re-evaluate on resize
document.addEventListener('DOMContentLoaded', toggleHeaderElementsVisibility); // Initial check on load
