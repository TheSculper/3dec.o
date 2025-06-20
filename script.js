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
                if (window.innerWidth <= 768) {
                    navList.classList.remove('menu-active');
                    menuToggle.classList.remove('open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    // --- Header Dinámico en Scroll (index.html) ---
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.innerWidth <= 768) { // Solo para dispositivos móviles
                if (window.scrollY > 50) { // Si el scroll es mayor a 50px
                    header.classList.add('header-scrolled');
                } else {
                    header.classList.remove('header-scrolled');
                }
            } else {
                header.classList.remove('header-scrolled'); // Asegurarse de que no esté activo en desktop
            }
        });
        // Asegurarse de que el header se adapte si se carga la página con scroll en móvil
        if (window.innerWidth <= 768 && window.scrollY > 50) {
            header.classList.add('header-scrolled');
        }
    }
});

// --- CONFIGURATION DATA (Adjust these values to your actual costs) ---
const MATERIAL_DATA = {
    'PLA': {
        'PLA_17': { baseCost: 17, colors: ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo'] },
        'PLA_20': { baseCost: 20, colors: ['Rojo brillante', 'Verde limón', 'Naranja', 'Rosa'] }
    },
    'PETG': {
        'PETG_23': { baseCost: 23, colors: ['Negro', 'Transparente', 'Verde oscuro', 'Azul Transparente'] }
    },
    'ABS': {
        'ABS_25': { baseCost: 25, colors: ['Negro', 'Gris', 'Blanco', 'Rojo'] }
    },
    'TPU': {
        'TPU_30': { baseCost: 30, colors: ['Negro', 'Translúcido', 'Rojo', 'Azul'] }
    }
};


const FIXED_COSTS = {
    machineOperatingCostPerHour: 2000,           // Fixed cost per hour of printing (electricity, machine wear, etc.)
    laborCostPerHour: 2000,                     // Labor cost per hour (for post-processing)
    profitMargin: 0.35,                         // 35% Profit Margin
    supportMaterialFactor: 0.10,                // 10% of main material cost for support material
    failureRateFactor: 0.05,                    // 5% factor to cover failed prints
    packagingCostsByVolume: [
        { maxVolumeCm3: 100, cost: 650 },     // Small items
        { maxVolumeCm3: 500, cost: 1300 },    // Medium items
        { maxVolumeCm3: 2000, cost: 2500 },   // Large items
        { maxVolumeCm3: Infinity, cost: 4000 } // Very large items
    ]
};

// --- Your WhatsApp Number (Ofuscated for basic protection) ---
const WHATSAPP_PHONE_NUMBER = "34685002931"; // Número real de WhatsApp

// --- DOM ELEMENTS (calculo.html specific) ---
const materialSelect = document.getElementById('materialSelect');
const colorSelect = document.getElementById('colorSelect');
const pesoInput = document.getElementById('pesoInput');
const tiempoInput = document.getElementById('tiempoInput');
const postProcesadoInput = document.getElementById('postProcesadoInput');
const largoInput = document.getElementById('largoInput');
const anchoInput = document.getElementById('anchoInput');
const altoInput = document.getElementById('altoInput');
const errorMessagesDiv = document.getElementById('errorMessages'); // Añadido para mensajes de error

// Spans to display breakdown and total
const costoMaterialBaseSpan = document.getElementById('costoMaterialBase');
const costoMaterialSoporteSpan = document.getElementById('costoMaterialSoporte');
const costoMaquinaSpan = document.getElementById('costoMaquina');
const costoPostProcesadoSpan = document.getElementById('costoPostProcesado');
const costoEmpaqueSpan = document.getElementById('costoEmpaque');
const subtotalInicialSpan = document.getElementById('subtotalInicial');
const ajusteFalloSpan = document.getElementById('ajusteFallo');
const margenGananciaSpan = document.getElementById('margenGanancia');
const costoTotalSpan = document.getElementById('costoTotal');

// Elements for the breakdown dropdown
const toggleDesgloseBtn = document.getElementById('toggleDesglose');
const desgloseContenidoDiv = document.getElementById('desgloseContenido');
// const toggleArrow = document.getElementById('toggleArrow'); // Ya no es necesario si la flecha es parte de toggleDesgloseBtn y se rota con CSS

// Buttons for WhatsApp integration
const enviarWhatsAppBtn = document.getElementById('enviarWhatsAppBtn');
const stlFileInput = document.getElementById('stlFileInput');
const enviarStlWhatsAppBtn = document.getElementById('enviarStlWhatsAppBtn');


// --- FUNCTIONS ---

// Updates color options based on selected material
function actualizarOpcionesColor() {
    const selectedMaterialValue = materialSelect.value;
    colorSelect.innerHTML = '<option value="">Selecciona un color</option>'; // Reset options
    colorSelect.disabled = true; // Deshabilitar por defecto

    if (selectedMaterialValue) {
        const parts = selectedMaterialValue.split('_');
        const materialCategory = parts[0]; // e.g., 'PLA', 'PETG'
        const materialSpecific = selectedMaterialValue; // e.g., 'PLA_17'

        const materialData = MATERIAL_DATA[materialCategory]?.[materialSpecific];

        if (materialData && materialData.colors) {
            materialData.colors.forEach(color => {
                const option = document.createElement('option');
                option.textContent = color;
                option.value = color;
                colorSelect.appendChild(option);
            });
            colorSelect.disabled = false; // Habilitar si hay colores
        }
    }
    calculateAndDisplayCost(); // Recalculate when material changes
}

// Function to calculate packaging cost based on calculated volume
function calculatePackagingCost(volumeCm3) {
    if (isNaN(volumeCm3) || volumeCm3 < 0) {
        return 0;
    }
    for (const range of FIXED_COSTS.packagingCostsByVolume) {
        if (volumeCm3 <= range.maxVolumeCm3) {
            return range.cost;
        }
    }
    return 0;
}

// Function to display error messages
function showErrorMessage(message) {
    errorMessagesDiv.innerHTML = `<p>${message}</p>`;
    errorMessagesDiv.style.display = 'block';
}

// Function to clear error messages
function clearErrorMessages() {
    errorMessagesDiv.innerHTML = '';
    errorMessagesDiv.style.display = 'none';
}


// Main function to calculate and display costs (for manual input flow)
function calculateAndDisplayCost() {
    clearErrorMessages(); // Clear previous errors

    // Get values from input fields, ensuring they are valid numbers
    const selectedMaterialOption = materialSelect.value;
    const peso = parseFloat(pesoInput.value);
    const tiempo = parseFloat(tiempoInput.value);
    const postProcesado = parseFloat(postProcesadoInput.value);
    const largo = parseFloat(largoInput.value);
    const ancho = parseFloat(anchoInput.value);
    const alto = parseFloat(altoInput.value);

    // Validate main inputs. If any are invalid, reset display
    let isValid = true;
    if (!selectedMaterialOption) {
        showErrorMessage("Por favor, selecciona un tipo de material.");
        isValid = false;
    }
    if (isNaN(peso) || peso <= 0) {
        showErrorMessage("Ingresa un peso válido (> 0).");
        isValid = false;
    }
    if (isNaN(tiempo) || tiempo <= 0) {
        showErrorMessage("Ingresa un tiempo de impresión válido (> 0).");
        isValid = false;
    }
    if (isNaN(postProcesado) || postProcesado < 0) {
        showErrorMessage("Ingresa un tiempo de post-procesado válido (>= 0).");
        isValid = false;
    }
    if (isNaN(largo) || largo <= 0 || isNaN(ancho) || ancho <= 0 || isNaN(alto) || alto <= 0) {
        showErrorMessage("Ingresa dimensiones válidas (> 0 para Largo, Ancho y Alto).");
        isValid = false;
    }

    if (!isValid) {
        // Reset all display spans
        costoMaterialBaseSpan.textContent = '0.00';
        costoMaterialSoporteSpan.textContent = '0.00';
        costoMaquinaSpan.textContent = '0.00';
        costoPostProcesadoSpan.textContent = '0.00';
        costoEmpaqueSpan.textContent = '0.00';
        subtotalInicialSpan.textContent = '0.00';
        ajusteFalloSpan.textContent = '0.00';
        margenGananciaSpan.textContent = '0.00';
        costoTotalSpan.textContent = '0.00';
        enviarWhatsAppBtn.style.display = 'none';
        return;
    }

    // Calculate the volume of the piece (cm³)
    const volumenCalculado = largo * ancho * alto;

    // Extract base cost per kg for the selected material
    const parts = selectedMaterialOption.split('_');
    const materialCategory = parts[0];
    const materialSpecific = selectedMaterialOption;

    const materialData = MATERIAL_DATA[materialCategory]?.[materialSpecific];
    // Convert cost from €/kg to €/gram
    const materialCostPerGram = materialData ? materialData.baseCost / 1000 : 0; // €/kg -> €/g

    // --- Calculate and display individual costs with operations ---
    const baseMaterialCost = materialCostPerGram * peso; // cost in euros
    costoMaterialBaseSpan.textContent = `${(materialCostPerGram * 1000).toFixed(2)} €/kg * ${peso.toFixed(2)} g = ${baseMaterialCost.toFixed(2)} €`;

    const supportCost = baseMaterialCost * FIXED_COSTS.supportMaterialFactor;
    costoMaterialSoporteSpan.textContent = `${baseMaterialCost.toFixed(2)} € * ${FIXED_COSTS.supportMaterialFactor * 100}% = ${supportCost.toFixed(2)} €`;

    const machineOperatingCost = FIXED_COSTS.machineOperatingCostPerHour * tiempo;
    costoMaquinaSpan.textContent = `${FIXED_COSTS.machineOperatingCostPerHour.toFixed(2)} €/h * ${tiempo.toFixed(1)} h = ${machineOperatingCost.toFixed(2)} €`;

    const postProcessingCost = FIXED_COSTS.laborCostPerHour * postProcesado;
    costoPostProcesadoSpan.textContent = `${FIXED_COSTS.laborCostPerHour.toFixed(2)} €/h * ${postProcesado.toFixed(1)} h = ${postProcessingCost.toFixed(2)} €`;

    const packagingCost = calculatePackagingCost(volumenCalculado);
    costoEmpaqueSpan.textContent = `${largo.toFixed(1)}x${ancho.toFixed(1)}x${alto.toFixed(1)} cm = ${volumenCalculado.toFixed(2)} cm³ = ${packagingCost.toFixed(2)} €`;

    const subTotalCostBeforeFactors = baseMaterialCost + supportCost + machineOperatingCost + postProcessingCost + packagingCost;
    subtotalInicialSpan.textContent = `${subTotalCostBeforeFactors.toFixed(2)} €`;

    const failureAdjustmentAmount = subTotalCostBeforeFactors * FIXED_COSTS.failureRateFactor;
    const subTotalCostWithFailure = subTotalCostBeforeFactors + failureAdjustmentAmount;
    ajusteFalloSpan.textContent = `${failureAdjustmentAmount.toFixed(2)} €`;

    const profitAmount = subTotalCostWithFailure * FIXED_COSTS.profitMargin;
    const totalCost = subTotalCostWithFailure + profitAmount;
    margenGananciaSpan.textContent = `${profitAmount.toFixed(2)} €`;

    costoTotalSpan.textContent = totalCost.toFixed(2);

    // --- WhatsApp Button Logic for Manual Quote ---
    enviarWhatsAppBtn.style.display = 'block';
    enviarWhatsAppBtn.onclick = () => {
        const phoneNumber = WHATSAPP_PHONE_NUMBER;
        const message = `
¡Hola! 👋 Me gustaría cotizar una impresión 3D con los siguientes detalles (ingresados manualmente):

*Material:* ${materialSelect.options[materialSelect.selectedIndex].text}
*Color:* ${colorSelect.value || 'No especificado'}
*Peso:* ${peso.toFixed(2)} gramos
*Tiempo de Impresión:* ${tiempo.toFixed(1)} horas
*Tiempo de Post-Procesado:* ${postProcesado.toFixed(1)} horas
*Dimensiones:* ${largo.toFixed(1)}cm (L) x ${ancho.toFixed(1)}cm (A) x ${alto.toFixed(1)}cm (Al) = ${volumenCalculado.toFixed(2)} cm³

---
*Desglose Estimado:*
- Material Base: ${baseMaterialCost.toFixed(2)} €
- Material Soporte: ${supportCost.toFixed(2)} €
- Operación Máquina: ${machineOperatingCost.toFixed(2)} €
- Post-Procesado: ${postProcessingCost.toFixed(2)} €
- Empaque: ${packagingCost.toFixed(2)} €
- Subtotal (sin fallo/margen): ${subTotalCostBeforeFactors.toFixed(2)} €
- Ajuste por Fallo: ${failureAdjustmentAmount.toFixed(2)} €
- Margen de Ganancia: ${profitAmount.toFixed(2)} €

*Costo Total Estimado:* ${totalCost.toFixed(2)} €
---

¡Espero tu confirmación!
        `;
        const encodedMessage = encodeURIComponent(message);
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappLink, '_blank');
    };
}

// --- EVENT LISTENERS ---

// Listener for the STL file input
if (stlFileInput) {
    stlFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            enviarStlWhatsAppBtn.style.display = 'block';
        } else {
            enviarStlWhatsAppBtn.style.display = 'none';
        }
    });
}


// Listener for the "Enviar Archivo 3D para Cotización" button
if (enviarStlWhatsAppBtn) {
    enviarStlWhatsAppBtn.addEventListener('click', () => {
        const file = stlFileInput.files[0];
        if (!file) {
            alert('Por favor, selecciona un archivo 3D primero.');
            return;
        }

        const phoneNumber = WHATSAPP_PHONE_NUMBER;
        const fileName = file.name;

        const message = `
¡Hola! 👋 Te envío un archivo 3D para cotización.

*Nombre del archivo:* ${fileName}

Por favor, revisa el archivo adjunto (que enviaré por separado en WhatsApp) y envíame una cotización.

¡Gracias!
        `;
        const encodedMessage = encodeURIComponent(message);
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappLink, '_blank');
        alert(`Por favor, recuerda adjuntar el archivo "${fileName}" directamente en el chat de WhatsApp después de hacer clic en Aceptar.`);
    });
}

// Listener for the breakdown toggle (only if elements exist, i.e., on calculo.html)
if (toggleDesgloseBtn && desgloseContenidoDiv) {
    toggleDesgloseBtn.addEventListener('click', () => {
        desgloseContenidoDiv.classList.toggle('hidden'); // Alterna la clase 'hidden'
        toggleDesgloseBtn.classList.toggle('active'); // Alterna la clase 'active' para rotar la flecha
    });
}


// Listeners for manual input changes (trigger recalculation)
if (materialSelect) materialSelect.addEventListener('change', actualizarOpcionesColor);
if (pesoInput) pesoInput.addEventListener('input', calculateAndDisplayCost);
if (tiempoInput) tiempoInput.addEventListener('input', calculateAndDisplayCost);
if (postProcesadoInput) postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
if (largoInput) largoInput.addEventListener('input', calculateAndDisplayCost);
if (anchoInput) anchoInput.addEventListener('input', calculateAndDisplayCost);
if (altoInput) altoInput.addEventListener('input', calculateAndDisplayCost);
if (colorSelect) colorSelect.addEventListener('change', calculateAndDisplayCost);


// Prevent form submission (which would reload the page)
if (document.getElementById('calculoForm')) {
    document.getElementById('calculoForm').addEventListener('submit', function(event) {
        event.preventDefault();
        calculateAndDisplayCost();
    });
}


// Initialize the calculator and color options when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if materialSelect exists before calling actualizarOpcionesColor
    if (materialSelect) {
        actualizarOpcionesColor();
    }
});


// --- FOOTER ONLY VISIBLE AT BOTTOM ON MOBILE ---
function toggleFooterOnScroll() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    if (window.innerWidth <= 768) {
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

window.addEventListener('scroll', toggleFooterOnScroll);
window.addEventListener('resize', toggleFooterOnScroll);
document.addEventListener('DOMContentLoaded', toggleFooterOnScroll);
