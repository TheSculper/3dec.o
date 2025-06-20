// --- DATOS DE CONFIGURACIÓN (Puedes ajustarlos según tus costos reales) ---
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
    machineOperatingCostPerHour: 2000, // Costo fijo por hora de impresión (luz, desgaste máquina, etc.)
    laborCostPerHour: 2000,           // Costo de mano de obra por hora (para post-procesado)
    profitMargin: 0.25,               // Margen de ganancia del 25%
    supportMaterialFactor: 0.10,      // 10% del costo del material principal para material de soporte
    failureRateFactor: 0.05           // Factor del 5% para cubrir impresiones fallidas
};

// --- ELEMENTOS DEL DOM ---
const materialSelect = document.getElementById('materialSelect');
const colorSelect = document.getElementById('colorSelect');
const pesoInput = document.getElementById('pesoInput');
const tiempoInput = document.getElementById('tiempoInput');
const postProcesadoInput = document.getElementById('postProcesadoInput');

// Spans para mostrar el desglose y el total
const costoMaterialBaseSpan = document.getElementById('costoMaterialBase');
const costoMaterialSoporteSpan = document.getElementById('costoMaterialSoporte');
const costoMaquinaSpan = document.getElementById('costoMaquina');
const costoPostProcesadoSpan = document.getElementById('costoPostProcesado');
const subtotalInicialSpan = document.getElementById('subtotalInicial');
const ajusteFalloSpan = document.getElementById('ajusteFallo');
const margenGananciaSpan = document.getElementById('margenGanancia');
const costoTotalSpan = document.getElementById('costoTotal');

// --- FUNCIONES ---

function actualizarOpcionesColor() {
    const selectedMaterialValue = materialSelect.value;
    colorSelect.innerHTML = '<option value="">Selecciona un color</option>'; // Restablecer opciones

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
    calculateAndDisplayCost(); // Recalcular al cambiar el material
}

function calculateAndDisplayCost() {
    // Obtener valores de los campos de entrada
    const selectedMaterialOption = materialSelect.value;
    const peso = parseFloat(pesoInput.value);
    const tiempo = parseFloat(tiempoInput.value);
    const postProcesado = parseFloat(postProcesadoInput.value);

    // Reiniciar visualización si las entradas son inválidas
    if (!selectedMaterialOption || isNaN(peso) || isNaN(tiempo) || isNaN(postProcesado)) {
        costoMaterialBaseSpan.textContent = '0.00';
        costoMaterialSoporteSpan.textContent = '0.00';
        costoMaquinaSpan.textContent = '0.00';
        costoPostProcesadoSpan.textContent = '0.00';
        subtotalInicialSpan.textContent = '0.00';
        ajusteFalloSpan.textContent = '0.00';
        margenGananciaSpan.textContent = '0.00';
        costoTotalSpan.textContent = '0.00';
        return;
    }

    // Extraer el costo base por gramo del material seleccionado
    const materialType = selectedMaterialOption.split('_')[1];
    const materialData = MATERIAL_DATA[materialType]?.[selectedMaterialOption];
    const materialCostPerGram = materialData ? materialData.baseCost : 0;

    // --- Calcular y mostrar costos individuales con operaciones ---
    
    // Costo del Material Base
    const baseMaterialCost = materialCostPerGram * peso;
    costoMaterialBaseSpan.textContent = `${materialCostPerGram} [CLP/g] * ${peso} [g] = $${baseMaterialCost.toFixed(2)}`;

    // Costo Material de Soporte
    const supportCost = baseMaterialCost * FIXED_COSTS.supportMaterialFactor;
    costoMaterialSoporteSpan.textContent = `$${baseMaterialCost.toFixed(2)} * ${FIXED_COSTS.supportMaterialFactor * 100}% = $${supportCost.toFixed(2)}`;

    // Costo de Operación de Máquina
    const machineOperatingCost = FIXED_COSTS.machineOperatingCostPerHour * tiempo;
    costoMaquinaSpan.textContent = `${FIXED_COSTS.machineOperatingCostPerHour} [CLP/h] * ${tiempo} [h] = $${machineOperatingCost.toFixed(2)}`;

    // Costo de Post-Procesado
    const postProcessingCost = FIXED_COSTS.laborCostPerHour * postProcesado;
    costoPostProcesadoSpan.textContent = `${FIXED_COSTS.laborCostPerHour} [CLP/h] * ${postProcesado} [h] = $${postProcessingCost.toFixed(2)}`;

    // Sumar todos los costos base (subtotal antes de aplicar margen y fallos)
    const subTotalCostBeforeFactors = baseMaterialCost + supportCost + machineOperatingCost + postProcessingCost;
    subtotalInicialSpan.textContent = `$${baseMaterialCost.toFixed(2)} + $${supportCost.toFixed(2)} + $${machineOperatingCost.toFixed(2)} + $${postProcessingCost.toFixed(2)} = $${subTotalCostBeforeFactors.toFixed(2)}`;

    // Calcular el ajuste por tasa de fallo y el subtotal con ajuste
    const failureAdjustmentAmount = subTotalCostBeforeFactors * FIXED_COSTS.failureRateFactor;
    const subTotalCostWithFailure = subTotalCostBeforeFactors + failureAdjustmentAmount;
    ajusteFalloSpan.textContent = `$${subTotalCostBeforeFactors.toFixed(2)} * ${FIXED_COSTS.failureRateFactor * 100}% = $${failureAdjustmentAmount.toFixed(2)} (Total con fallo: $${subTotalCostWithFailure.toFixed(2)})`;

    // Calcular el margen de ganancia y el costo total
    const profitAmount = subTotalCostWithFailure * FIXED_COSTS.profitMargin;
    const totalCost = subTotalCostWithFailure + profitAmount;
    margenGananciaSpan.textContent = `$${subTotalCostWithFailure.toFixed(2)} * ${FIXED_COSTS.profitMargin * 100}% = $${profitAmount.toFixed(2)}`;
    
    // Costo Total Final
    costoTotalSpan.textContent = totalCost.toFixed(2);
}

// --- LISTENERS DE EVENTOS ---

materialSelect.addEventListener('change', actualizarOpcionesColor);
pesoInput.addEventListener('input', calculateAndDisplayCost);
tiempoInput.addEventListener('input', calculateAndDisplayCost);
postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
colorSelect.addEventListener('change', calculateAndDisplayCost); 

document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();
    calculateAndDisplayCost();
});

// Inicializar la calculadora al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarOpcionesColor(); // Esto inicializará los colores y luego el cálculo
});
