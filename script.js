// --- DATOS DE CONFIGURACIÓN (Puedes ajustarlos según tus costos reales) ---
const MATERIAL_DATA = {
    'PLA': {
        '17_PLA': { baseCost: 17, colors: ['Negro', 'Blanco', 'Gris', 'Azul'] },
        '20_PLA': { baseCost: 20, colors: ['Rojo brillante', 'Verde limón', 'Naranja'] } // Ejemplo de PLA más caro por colores especiales
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

const costoMaterialBaseSpan = document.getElementById('costoMaterialBase');
const costoMaterialSoporteSpan = document.getElementById('costoMaterialSoporte');
const costoMaquinaSpan = document.getElementById('costoMaquina');
const costoPostProcesadoSpan = document.getElementById('costoPostProcesado');
const subtotalInicialSpan = document.getElementById('subtotalInicial');
const ajusteFalloSpan = document.getElementById('ajusteFallo');
const margenGananciaSpan = document.getElementById('margenGanancia');
const costoTotalSpan = document.getElementById('costoTotal');

// --- FUNCIONES ---

// Actualiza las opciones de color basadas en el material seleccionado
function actualizarOpcionesColor() {
    const selectedMaterialValue = materialSelect.value;
    colorSelect.innerHTML = '<option value="">Selecciona un color</option>'; // Restablecer opciones

    if (selectedMaterialValue) {
        // Extraemos el tipo de material (ej. 'PLA', 'PETG')
        const materialType = selectedMaterialValue.split('_')[1]; 
        const materialOption = MATERIAL_DATA[materialType]?.[selectedMaterialValue];

        if (materialOption && materialOption.colors) {
            materialOption.colors.forEach(color => {
                const option = document.createElement('option');
                option.textContent = color;
                option.value = color; // El valor del color es el mismo que el texto
                colorSelect.appendChild(option);
            });
        }
    }
    calculateAndDisplayCost(); // Recalcular al cambiar el material (y, por ende, el color)
}

// Función principal de cálculo y visualización
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
        return; // Detiene la ejecución si hay valores inválidos
    }

    // Extraer el costo base por gramo del material seleccionado
    const materialType = selectedMaterialOption.split('_')[1];
    const materialData = MATERIAL_DATA[materialType]?.[selectedMaterialOption];
    const materialCostPerGram = materialData ? materialData.baseCost : 0;

    // Calcular costos individuales
    const baseMaterialCost = materialCostPerGram * peso;
    const supportCost = baseMaterialCost * FIXED_COSTS.supportMaterialFactor;
    const machineOperatingCost = FIXED_COSTS.machineOperatingCostPerHour * tiempo;
    const postProcessingCost = FIXED_COSTS.laborCostPerHour * postProcesado;

    // Sumar todos los costos base (subtotal antes de aplicar margen y fallos)
    const subTotalCostBeforeFactors = baseMaterialCost + supportCost + machineOperatingCost + postProcessingCost;

    // Calcular el ajuste por tasa de fallo y el subtotal con ajuste
    const failureAdjustmentAmount = subTotalCostBeforeFactors * FIXED_COSTS.failureRateFactor;
    const subTotalCostWithFailure = subTotalCostBeforeFactors + failureAdjustmentAmount;

    // Calcular el margen de ganancia y el costo total
    const profitAmount = subTotalCostWithFailure * FIXED_COSTS.profitMargin;
    const totalCost = subTotalCostWithFailure + profitAmount;

    // Mostrar el desglose y el resultado final
    costoMaterialBaseSpan.textContent = baseMaterialCost.toFixed(2);
    costoMaterialSoporteSpan.textContent = supportCost.toFixed(2);
    costoMaquinaSpan.textContent = machineOperatingCost.toFixed(2);
    costoPostProcesadoSpan.textContent = postProcessingCost.toFixed(2);
    subtotalInicialSpan.textContent = subTotalCostBeforeFactors.toFixed(2);
    ajusteFalloSpan.textContent = failureAdjustmentAmount.toFixed(2);
    margenGananciaSpan.textContent = profitAmount.toFixed(2);
    costoTotalSpan.textContent = totalCost.toFixed(2);
}

// --- LISTENERS DE EVENTOS ---

// Actualizar opciones de color cuando cambia el material
materialSelect.addEventListener('change', actualizarOpcionesColor);

// Actualizar el cálculo en tiempo real cuando cualquier campo cambia
pesoInput.addEventListener('input', calculateAndDisplayCost);
tiempoInput.addEventListener('input', calculateAndDisplayCost);
postProcesadoInput.addEventListener('input', calculateAndDisplayCost);
colorSelect.addEventListener('change', calculateAndDisplayCost); // Aunque el color no afecta el costo directamente, es bueno recalcular

// Asegurarse de que el formulario no intente enviarse (por si se mantiene el botón submit)
document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();
    calculateAndDisplayCost(); // Llama a la función de cálculo
});

// Inicializar la calculadora al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarOpcionesColor(); // Esto inicializará los colores y luego el cálculo
});
