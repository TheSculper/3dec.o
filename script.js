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

    // Packaging costs based on volume.
    // The 'cost' here should include the cost of the box, adhesive tape, bubble wrap,
    // labor time for packaging, and a small margin for packaging.
    packagingCostsByVolume: [
        // IMPORTANT! Adjust these values to your actual packaging costs:
        { maxVolumeCm3: 100, cost: 650 },     // Small items (e.g., envelope or small box)
        { maxVolumeCm3: 500, cost: 1300 },    // Medium items
        { maxVolumeCm3: 2000, cost: 2500 },   // Large items
        { maxVolumeCm3: Infinity, cost: 4000 } // Very large items
    ]
};

// --- DOM ELEMENTS ---
const materialSelect = document.getElementById('materialSelect');
const colorSelect = document.getElementById('colorSelect');
const pesoInput = document.getElementById('pesoInput');
const tiempoInput = document.getElementById('tiempoInput');
const postProcesadoInput = document.getElementById('postProcesadoInput');
// Inputs for dimensions
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

// New DOM element for the WhatsApp button
const enviarWhatsAppBtn = document.getElementById('enviarWhatsAppBtn');

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
    return 0; // If volume is unexpectedly large and no suitable range is found
}

// Main function to calculate and display costs
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

    let totalCost = 0.00; // Initialize totalCost here

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
        enviarWhatsAppBtn.style.display = 'none'; // Hide the button if there are errors
        return;
    }

    // Calculate the volume of the piece (cm³)
    const volumenCalculado = largo * ancho * alto;

    // Extract base cost per gram for the selected material
    const materialType = selectedMaterialOption.split('_')[1];
    const materialData = MATERIAL_DATA[materialType]?.[selectedMaterialOption];
    const materialCostPerGram = materialData ? materialData.baseCost : 0;

    // --- Calculate and display individual costs with operations ---

    // Base Material Cost: (Cost per gram * Weight)
    const baseMaterialCost = materialCostPerGram * peso;
    costoMaterialBaseSpan.textContent = `${materialCostPerGram} [CLP/g] * ${peso} [g] = $${baseMaterialCost.toFixed(2)}`;

    // Support Material Cost: (Base material cost * Support factor)
    const supportCost = baseMaterialCost * FIXED_COSTS.supportMaterialFactor;
    costoMaterialSoporteSpan.textContent = `$${baseMaterialCost.toFixed(2)} * ${FIXED_COSTS.supportMaterialFactor * 100}% = $${supportCost.toFixed(2)}`;

    // Machine Operation Cost: (Machine cost per hour * Print time)
    const machineOperatingCost = FIXED_COSTS.machineOperatingCostPerHour * tiempo;
    costoMaquinaSpan.textContent = `${FIXED_COSTS.machineOperatingCostPerHour} [CLP/h] * ${tiempo} [h] = $${machineOperatingCost.toFixed(2)}`;

    // Post-Processing Cost: (Labor cost per hour * Post-processing time)
    const postProcessingCost = FIXED_COSTS.laborCostPerHour * postProcesado;
    costoPostProcesadoSpan.textContent = `${FIXED_COSTS.laborCostPerHour} [CLP/h] * ${postProcesado} [h] = $${postProcessingCost.toFixed(2)}`;

    // Packaging Cost: Based on calculated volume
    const packagingCost = calculatePackagingCost(volumenCalculado);
    costoEmpaqueSpan.textContent = `${largo}cm x ${ancho}cm x ${alto}cm = ${volumenCalculado.toFixed(2)} cm³ = $${packagingCost.toFixed(2)}`;

    // Subtotal (sum of all direct costs before factors and margin)
    const subTotalCostBeforeFactors = baseMaterialCost + supportCost + machineOperatingCost + postProcessingCost + packagingCost;
    subtotalInicialSpan.textContent = `$${baseMaterialCost.toFixed(2)} + $${supportCost.toFixed(2)} + $${machineOperatingCost.toFixed(2)} + $${postProcessingCost.toFixed(2)} + $${packagingCost.toFixed(2)} = $${subTotalCostBeforeFactors.toFixed(2)}`;

    // Failure Rate Adjustment: (Initial subtotal * Failure factor)
    const failureAdjustmentAmount = subTotalCostBeforeFactors * FIXED_COSTS.failureRateFactor;
    const subTotalCostWithFailure = subTotalCostBeforeFactors + failureAdjustmentAmount;
    ajusteFalloSpan.textContent = `$${subTotalCostBeforeFactors.toFixed(2)} * ${FIXED_COSTS.failureRateFactor * 100}% = $${failureAdjustmentAmount.toFixed(2)} (Subtotal con fallo: $${subTotalCostWithFailure.toFixed(2)})`;

    // Profit Margin: (Subtotal with failure * Profit margin)
    const profitAmount = subTotalCostWithFailure * FIXED_COSTS.profitMargin;
    totalCost = subTotalCostWithFailure + profitAmount; // Assign value to totalCost variable
    margenGananciaSpan.textContent = `$${subTotalCostWithFailure.toFixed(2)} * ${FIXED_COSTS.profitMargin * 100}% = $${profitAmount.toFixed(2)}`;

    // Final Total Cost of the Piece
    costoTotalSpan.textContent = totalCost.toFixed(2);

    // --- WhatsApp Button Logic ---
    enviarWhatsAppBtn.style.display = 'block'; // Ensure the button is visible if all inputs are valid
    enviarWhatsAppBtn.onclick = () => { // Assign the action on click
        const phoneNumber = 'TU_NUMERO_DE_WHATSAPP'; // IMPORTANT: CHANGE THIS to your WhatsApp number with country code, no '+' or spaces! E.g.: '56912345678'

        // Construct the message with all details
        const message = `
¡Hola! 👋 Me gustaría cotizar una impresión 3D con los siguientes detalles:

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

        // Encode the message for the URL
        const encodedMessage = encodeURIComponent(message);

        // Create the WhatsApp link
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        // Open WhatsApp in a new tab/window
        window.open(whatsappLink, '_blank');
    };
}

// --- EVENT LISTENERS ---

// Listener for the breakdown toggle (shows/hides cost details)
toggleDesgloseBtn.addEventListener('click', () => {
    desgloseContenidoDiv.classList.toggle('visible');
    toggleDesgloseBtn.classList.toggle('active');
});

// Update color options and recalculate when material changes
materialSelect.addEventListener('change', actualizarOpcionesColor);

// Recalculate cost in real-time when any numeric input field changes
pesoInput.addEventListener('input', calculateAndDisplayCost);
tiempoInput.addEventListener('input', calculateAndDisplayCost);
postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
largoInput.addEventListener('input', calculateAndDisplayCost);
anchoInput.addEventListener('input', calculateAndDisplayCost);
altoInput.addEventListener('input', calculateAndDisplayCost);
colorSelect.addEventListener('change', calculateAndDisplayCost); // Recalculate even if color has no direct cost (for completeness)

// Ensure the form does not actually submit (which would reload the page)
document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();
    calculateAndDisplayCost();
});

// Initialize the calculator and color options when the page loads
document.addEventListener('DOMContentLoaded', () => {
    actualizarOpcionesColor();
});
