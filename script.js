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
    machineOperatingCostPerHour: 2000,           // Costo fijo por hora de impresión (luz, desgaste máquina, etc.)
    laborCostPerHour: 2000,                     // Costo de mano de obra por hora (para post-procesado)
    profitMargin: 0.50,                         // Margen de ganancia del 50%
    supportMaterialFactor: 0.10,                // 10% del costo del material principal para material de soporte
    failureRateFactor: 0.05,                    // Factor del 5% para cubrir impresiones fallidas
    
    // Configuración para costos de empaque basada en volumen.
    // Los 'cost' aquí deben incluir el costo de la caja, cinta adhesiva, papel burbuja,
    // el tiempo de mano de obra para empacar, y un pequeño margen para el empaque.
    packagingCostsByVolume: [
        // ¡IMPORTANTE! Ajusta estos valores a tus costos reales de empaque:
        { maxVolumeCm3: 100, cost: 650 },     // Piezas pequeñas (ej. sobre o caja pequeña)
        { maxVolumeCm3: 500, cost: 1300 },    // Piezas medianas
        { maxVolumeCm3: 2000, cost: 2500 },   // Piezas grandes
        { maxVolumeCm3: Infinity, cost: 4000 } // Piezas muy grandes
    ]
};

// --- ELEMENTOS DEL DOM ---
const materialSelect = document.getElementById('materialSelect');
const colorSelect = document.getElementById('colorSelect');
const pesoInput = document.getElementById('pesoInput');
const tiempoInput = document.getElementById('tiempoInput');
const postProcesadoInput = document.getElementById('postProcesadoInput');
// Inputs para dimensiones
const largoInput = document.getElementById('largoInput'); 
const anchoInput = document.getElementById('anchoInput');
const altoInput = document.getElementById('altoInput');

// Spans para mostrar el desglose y el total
const costoMaterialBaseSpan = document.getElementById('costoMaterialBase');
const costoMaterialSoporteSpan = document.getElementById('costoMaterialSoporte');
const costoMaquinaSpan = document.getElementById('costoMaquina');
const costoPostProcesadoSpan = document.getElementById('costoPostProcesado');
const costoEmpaqueSpan = document.getElementById('costoEmpaque'); 
const subtotalInicialSpan = document.getElementById('subtotalInicial');
const ajusteFalloSpan = document.getElementById('ajusteFallo');
const margenGananciaSpan = document.getElementById('margenGanancia');
const costoTotalSpan = document.getElementById('costoTotal');

// Elementos para el dropdown del desglose
const toggleDesgloseBtn = document.getElementById('toggleDesglose');
const desgloseContenidoDiv = document.getElementById('desgloseContenido');

// --- FUNCIONES ---

// Actualiza las opciones de color basadas en el material seleccionado
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

// Función para calcular el costo del empaque según el volumen calculado
function calculatePackagingCost(volumeCm3) {
    if (isNaN(volumeCm3) || volumeCm3 < 0) {
        return 0;
    }
    for (const range of FIXED_COSTS.packagingCostsByVolume) {
        if (volumeCm3 <= range.maxVolumeCm3) {
            return range.cost;
        }
    }
    return 0; // En caso de que el volumen sea inesperadamente grande y no haya un rango adecuado
}


// Función principal de cálculo y visualización de costos
function calculateAndDisplayCost() {
    // Obtener valores de los campos de entrada, asegurando que sean números válidos
    const selectedMaterialOption = materialSelect.value;
    const peso = parseFloat(pesoInput.value);
    const tiempo = parseFloat(tiempoInput.value);
    const postProcesado = parseFloat(postProcesadoInput.value);
    const largo = parseFloat(largoInput.value); 
    const ancho = parseFloat(anchoInput.value);
    const alto = parseFloat(altoInput.value); 

    // Validar entradas principales. Si alguna es inválida, se resetea la visualización
    const isInvalidInput = !selectedMaterialOption || isNaN(peso) || isNaN(tiempo) || isNaN(postProcesado) || peso < 0 || tiempo < 0 || postProcesado < 0;
    const isDimensionInvalid = isNaN(largo) || isNaN(ancho) || isNaN(alto) || largo < 0 || ancho < 0 || alto < 0;

    if (isInvalidInput || isDimensionInvalid) {
        costoMaterialBaseSpan.textContent = '0.00';
        costoMaterialSoporteSpan.textContent = '0.00';
        costoMaquinaSpan.textContent = '0.00';
        costoPostProcesadoSpan.textContent = '0.00';
        costoEmpaqueSpan.textContent = '0.00'; 
        subtotalInicialSpan.textContent = '0.00';
        ajusteFalloSpan.textContent = '0.00';
        margenGananciaSpan.textContent = '0.00';
        costoTotalSpan.textContent = '0.00';
        return; // Detiene la ejecución si hay valores inválidos
    }

    // Calcular el volumen de la pieza (cm³)
    const volumenCalculado = largo * ancho * alto;

    // Extraer el costo base por gramo del material seleccionado
    const materialType = selectedMaterialOption.split('_')[1];
    const materialData = MATERIAL_DATA[materialType]?.[selectedMaterialOption];
    const materialCostPerGram = materialData ? materialData.baseCost : 0;

    // --- Calcular y mostrar costos individuales con operaciones ---
    
    // Costo del Material Base: (Costo por gramo * Peso)
    const baseMaterialCost = materialCostPerGram * peso;
    costoMaterialBaseSpan.textContent = `${materialCostPerGram} [CLP/g] * ${peso} [g] = $${baseMaterialCost.toFixed(2)}`;

    // Costo Material de Soporte: (Costo material base * Factor de soporte)
    const supportCost = baseMaterialCost * FIXED_COSTS.supportMaterialFactor;
    costoMaterialSoporteSpan.textContent = `$${baseMaterialCost.toFixed(2)} * ${FIXED_COSTS.supportMaterialFactor * 100}% = $${supportCost.toFixed(2)}`;

    // Costo de Operación de Máquina: (Costo por hora máquina * Tiempo de impresión)
    const machineOperatingCost = FIXED_COSTS.machineOperatingCostPerHour * tiempo;
    costoMaquinaSpan.textContent = `${FIXED_COSTS.machineOperatingCostPerHour} [CLP/h] * ${tiempo} [h] = $${machineOperatingCost.toFixed(2)}`;

    // Costo de Post-Procesado: (Costo mano de obra por hora * Tiempo de post-procesado)
    const postProcessingCost = FIXED_COSTS.laborCostPerHour * postProcesado;
    costoPostProcesadoSpan.textContent = `${FIXED_COSTS.laborCostPerHour} [CLP/h] * ${postProcesado} [h] = $${postProcessingCost.toFixed(2)}`;

    // Costo de Empaque: Basado en el volumen calculado
    const packagingCost = calculatePackagingCost(volumenCalculado);
    costoEmpaqueSpan.textContent = `${largo}cm x ${ancho}cm x ${alto}cm = ${volumenCalculado.toFixed(2)} cm³ = $${packagingCost.toFixed(2)}`;

    // Subtotal (suma de todos los costos directos antes de factores y margen)
    const subTotalCostBeforeFactors = baseMaterialCost + supportCost + machineOperatingCost + postProcessingCost + packagingCost; 
    subtotalInicialSpan.textContent = `$${baseMaterialCost.toFixed(2)} + $${supportCost.toFixed(2)} + $${machineOperatingCost.toFixed(2)} + $${postProcessingCost.toFixed(2)} + $${packagingCost.toFixed(2)} = $${subTotalCostBeforeFactors.toFixed(2)}`;

    // Ajuste por Tasa de Fallo: (Subtotal inicial * Factor de fallo)
    const failureAdjustmentAmount = subTotalCostBeforeFactors * FIXED_COSTS.failureRateFactor;
    const subTotalCostWithFailure = subTotalCostBeforeFactors + failureAdjustmentAmount;
    ajusteFalloSpan.textContent = `$${subTotalCostBeforeFactors.toFixed(2)} * ${FIXED_COSTS.failureRateFactor * 100}% = $${failureAdjustmentAmount.toFixed(2)} (Subtotal con fallo: $${subTotalCostWithFailure.toFixed(2)})`;

    // Margen de Ganancia: (Subtotal con fallo * Margen de ganancia)
    const profitAmount = subTotalCostWithFailure * FIXED_COSTS.profitMargin;
    const totalCost = subTotalCostWithFailure + profitAmount;
    margenGananciaSpan.textContent = `$${subTotalCostWithFailure.toFixed(2)} * ${FIXED_COSTS.profitMargin * 100}% = $${profitAmount.toFixed(2)}`;
    
    // Costo Total Final de la Pieza
    costoTotalSpan.textContent = totalCost.toFixed(2);
}

// --- LISTENERS DE EVENTOS ---

// Listener para el toggle del desglose (muestra/oculta el detalle de costos)
toggleDesgloseBtn.addEventListener('click', () => {
    desgloseContenidoDiv.classList.toggle('visible');
    toggleDesgloseBtn.classList.toggle('active');
});

// Actualiza las opciones de color y recalcula cuando el material cambia
materialSelect.addEventListener('change', actualizarOpcionesColor);

// Recalcula el costo en tiempo real cuando cualquier campo de entrada numérico cambia
pesoInput.addEventListener('input', calculateAndDisplayCost);
tiempoInput.addEventListener('input', calculateAndDisplayCost);
postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
largoInput.addEventListener('input', calculateAndDisplayCost); 
anchoInput.addEventListener('input', calculateAndDisplayCost); 
altoInput.addEventListener('input', calculateAndDisplayCost); 
colorSelect.addEventListener('change', calculateAndDisplayCost); // También recalcula por si acaso, aunque el color no tiene costo directo

// Evita que el formulario se envíe realmente (lo cual recargaría la página)
document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault(); 
    calculateAndDisplayCost(); 
});

// Inicializa la calculadora y las opciones de color al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarOpcionesColor(); 
});
