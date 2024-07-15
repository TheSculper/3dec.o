document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const materialCost = parseFloat(document.getElementById('material').value);
    const weight = parseFloat(document.getElementById('peso').value);
    const time = parseFloat(document.getElementById('tiempo').value);
    const costPerHour = parseFloat(document.getElementById('costoHora').value);

    if (isNaN(materialCost) || isNaN(weight) || isNaN(time) || isNaN(costPerHour)) {
        alert('Por favor, ingrese valores válidos en todos los campos.');
        return;
    }

    const totalCost = (materialCost * weight) + (costPerHour * time);
    document.getElementById('costoTotal').textContent = totalCost.toFixed(2);
});
