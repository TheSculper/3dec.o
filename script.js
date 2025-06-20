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
});

// --- CONFIGURATION DATA (Adjust these values to your actual costs) ---
const MATERIAL_DATA = {
    'PLA': {
        '17_PLA': { baseCost: 17, colors: ['Negro', 'Blanco', 'Gris', 'Azul'] },
        '20_PLA': { baseCost: 20, colors: ['Rojo brillante', 'Verde limón', 'Naranja'] }
    },
    'PETG': {
        '23_PETG': { baseCost: 23, colors: ['Negro', 'Transparente', 'Verde oscuro'] }
    },
    'ABS': {
        '30_ABS': { baseCost: 30, colors: ['Negro', 'Gris', 'Blanco'] }
    },
    'TPU': {
        '40_TPU': { baseCost: 40, colors: ['Negro', 'Translúcido', 'Rojo'] }
    }
};

const FIXED_COSTS = {
    machineOperatingCostPerHour: 2000,           // Fixed cost per hour of printing (electricity, machine wear, etc.)
    laborCostPerHour: 2000,                     // Labor cost per hour (for post-processing)
    profitMargin: 0.50,                         // 50% Profit Margin!
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
const WHATSAPP_PHONE_NUMBER = "569" + "752" + "977" + "891";

// --- DOM ELEMENTS ---
const materialSelect = document.getElementById('materialSelect');
const colorSelect = document.getElementById('colorSelect');
const pesoInput = document.getElementById('pesoInput');
const tiempoInput = document.getElementById('tiempoInput');
const postProcesadoInput = document.getElementById('postProcesadoInput');
const largoInput = document.getElementById('largoInput');
const anchoInput = document.getElementById('anchoInput');
const altoInput = document.getElementById('altoInput');

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

// Buttons for WhatsApp integration
const enviarWhatsAppBtn = document.getElementById('enviarWhatsAppBtn');
const stlFileInput = document.getElementById('stlFileInput');
const enviarStlWhatsAppBtn = document.getElementById('enviarStlWhatsAppBtn');

// --- FUNCTIONS ---

// Updates color options based on selected material
function actualizarOpcionesColor() {
    const selectedMaterialValue = materialSelect.value;
    colorSelect.innerHTML = '<option value="">Selecciona un color</option>'; // Reset options

    if (selectedMaterialValue) {
        const materialType = selectedMaterialValue.split('_')[1];
        const materialOption = MATERIAL_DATA[materialType]?.[selectedMaterialValue];

        if (materialOption && materialOption.colors) {
            materialOption.colors.forEach(color => {
                const option = document.createElement('option');
                option.textContent = color;
                option.value = color;
                colorSelect.appendChild(option);
            });
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

// Main function to calculate and display costs (for manual input flow)
function calculateAndDisplayCost() {
    // Get values from input fields, ensuring they are valid numbers
    const selectedMaterialOption = materialSelect.value;
    const peso = parseFloat(pesoInput.value);
    const tiempo = parseFloat(tiempoInput.value);
    const postProcesado = parseFloat(postProcesadoInput.value);
    const largo = parseFloat(largoInput.value);
    const ancho = parseFloat(anchoInput.value);
    const alto = parseFloat(altoInput.value);

    // Validate main inputs. If any are invalid, reset display
    const isInvalidInput = !selectedMaterialOption || isNaN(peso) || isNaN(tiempo) || isNaN(postProcesado) || peso < 0 || tiempo < 0 || postProcesado < 0;
    const isDimensionInvalid = isNaN(largo) || isNaN(ancho) || isNaN(alto) || largo < 0 || ancho < 0 || alto < 0;

    let totalCost = 0.00;

    if (isInvalidInput || isDimensionInvalid) {
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

    // Extract base cost per gram for the selected material
    const materialType = selectedMaterialOption.split('_')[1];
    const materialData = MATERIAL_DATA[materialType]?.[selectedMaterialOption];
    const materialCostPerGram = materialData ? materialData.baseCost : 0;

    // --- Calculate and display individual costs with operations ---
    const baseMaterialCost = materialCostPerGram * peso;
    costoMaterialBaseSpan.textContent = `${materialCostPerGram} [CLP/g] * ${peso} [g] = $${baseMaterialCost.toFixed(2)}`;

    const supportCost = baseMaterialCost * FIXED_COSTS.supportMaterialFactor;
    costoMaterialSoporteSpan.textContent = `$${baseMaterialCost.toFixed(2)} * ${FIXED_COSTS.supportMaterialFactor * 100}% = $${supportCost.toFixed(2)}`;

    const machineOperatingCost = FIXED_COSTS.machineOperatingCostPerHour * tiempo;
    costoMaquinaSpan.textContent = `${FIXED_COSTS.machineOperatingCostPerHour} [CLP/h] * ${tiempo} [h] = $${machineOperatingCost.toFixed(2)}`;

    const postProcessingCost = FIXED_COSTS.laborCostPerHour * postProcesado;
    costoPostProcesadoSpan.textContent = `${FIXED_COSTS.laborCostPerHour} [CLP/h] * ${postProcesado} [h] = $${postProcessingCost.toFixed(2)}`;

    const packagingCost = calculatePackagingCost(volumenCalculado);
    costoEmpaqueSpan.textContent = `${largo}cm x ${ancho}cm x ${alto}cm = ${volumenCalculado.toFixed(2)} cm³ = $${packagingCost.toFixed(2)}`;

    const subTotalCostBeforeFactors = baseMaterialCost + supportCost + machineOperatingCost + postProcessingCost + packagingCost;
    subtotalInicialSpan.textContent = `$${baseMaterialCost.toFixed(2)} + $${supportCost.toFixed(2)} + $${machineOperatingCost.toFixed(2)} + $${postProcessingCost.toFixed(2)} + $${packagingCost.toFixed(2)} = $${subTotalCostBeforeFactors.toFixed(2)}`;

    const failureAdjustmentAmount = subTotalCostBeforeFactors * FIXED_COSTS.failureRateFactor;
    const subTotalCostWithFailure = subTotalCostBeforeFactors + failureAdjustmentAmount;
    ajusteFalloSpan.textContent = `$${subTotalCostBeforeFactors.toFixed(2)} * ${FIXED_COSTS.failureRateFactor * 100}% = $${failureAdjustmentAmount.toFixed(2)} (Subtotal con fallo: $${subTotalCostWithFailure.toFixed(2)})`;

    const profitAmount = subTotalCostWithFailure * FIXED_COSTS.profitMargin;
    totalCost = subTotalCostWithFailure + profitAmount;
    margenGananciaSpan.textContent = `$${subTotalCostWithFailure.toFixed(2)} * ${FIXED_COSTS.profitMargin * 100}% = $${profitAmount.toFixed(2)}`;

    costoTotalSpan.textContent = totalCost.toFixed(2);

    // --- WhatsApp Button Logic for Manual Quote ---
    enviarWhatsAppBtn.style.display = 'block';
    enviarWhatsAppBtn.onclick = () => {
        const phoneNumber = WHATSAPP_PHONE_NUMBER;
        const message = `
¡Hola! 👋 Me gustaría cotizar una impresión 3D con los siguientes detalles (ingresados manualmente):

*Material:* ${materialSelect.options[materialSelect.selectedIndex].text}
*Color:* ${colorSelect.value || 'No especificado'}
*Peso:* ${peso} gramos
*Tiempo de Impresión:* ${tiempo} horas
*Tiempo de Post-Procesado:* ${postProcesado} horas
*Dimensiones:* ${largo}cm (L) x ${ancho}cm (A) x ${alto}cm (Al) = ${volumenCalculado.toFixed(2)} cm³

---
*Desglose Estimado:*
- Material Base: $${baseMaterialCost.toFixed(2)}
- Material Soporte: $${supportCost.toFixed(2)}
- Operación Máquina: $${machineOperatingCost.toFixed(2)}
- Post-Procesado: $${postProcessingCost.toFixed(2)}
- Empaque: $${packagingCost.toFixed(2)}
- Subtotal (sin fallo/margen): $${subTotalCostBeforeFactors.toFixed(2)}
- Ajuste por Fallo: $${failureAdjustmentAmount.toFixed(2)}
- Margen de Ganancia: $${profitAmount.toFixed(2)}

*Costo Total Estimado:* $${totalCost.toFixed(2)}
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
stlFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        enviarStlWhatsAppBtn.style.display = 'block';
    } else {
        enviarStlWhatsAppBtn.style.display = 'none';
    }
});

// Listener for the "Enviar Archivo 3D para Cotización" button
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

// Listener for the breakdown toggle
toggleDesgloseBtn.addEventListener('click', () => {
    desgloseContenidoDiv.classList.toggle('visible');
    toggleDesgloseBtn.classList.toggle('active');
});

// Listeners for manual input changes (trigger recalculation)
materialSelect.addEventListener('change', actualizarOpcionesColor);
pesoInput.addEventListener('input', calculateAndDisplayCost);
tiempoInput.addEventListener('input', calculateAndDisplayCost);
postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
largoInput.addEventListener('input', calculateAndDisplayCost);
anchoInput.addEventListener('input', calculateAndDisplayCost);
altoInput.addEventListener('input', calculateAndDisplayCost);
colorSelect.addEventListener('change', calculateAndDisplayCost);

// Prevent form submission (which would reload the page)
document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();
    calculateAndDisplayCost();
});

// Initialize the calculator and color options when the page loads
document.addEventListener('DOMContentLoaded', () => {
    actualizarOpcionesColor();
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
