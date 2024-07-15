document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const materialCost = parseFloat(document.getElementById('material').value);
    const weight = parseFloat(document.getElementById('peso').value);
    const time = parseFloat(document.getElementById('tiempo').value);
    const fixedCostPerHour = 5000; //Costo fijo por hora de impresión

    if (isNaN(materialCost) || isNaN(weight) || isNaN(time) {
        alert('Por favor, ingrese valores válidos en todos los campos.');
        return;
    }

    const totalCost = (materialCost * weight) + (fixedCostPerHour * time);
    document.getElementById('costoTotal').textContent = totalCost.toFixed(2);
});
