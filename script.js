document.getElementById('calculoForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const materialCostPerGram = parseFloat(document.getElementById('material').value); // Assuming cost per gram/unit
    const weightInGrams = parseFloat(document.getElementById('peso').value); // Weight of the part in grams
    const printTimeInHours = parseFloat(document.getElementById('tiempo').value); // Printing time in hours
    const fixedCostPerHour = 5000; // Fixed cost per hour of printing (e.g., machine depreciation, electricity)
    const profitMargin = 0.20; // 20% profit margin
    const supportMaterialFactor = 0.10; // 10% of main material cost for support material (adjust as needed)

    if (isNaN(materialCostPerGram) || isNaN(weightInGrams) || isNaN(printTimeInHours)) {
        alert('Por favor, ingrese valores válidos en todos los campos.');
        return;
    }

    // Calculate basic material cost
    const baseMaterialCost = materialCostPerGram * weightInGrams;

    // Calculate support material cost
    const supportCost = baseMaterialCost * supportMaterialFactor;

    // Calculate labor/machine cost
    const laborMachineCost = fixedCostPerHour * printTimeInHours;

    // Sum up base costs
    const subTotalCost = baseMaterialCost + supportCost + laborMachineCost;

    // Apply profit margin
    const totalCost = subTotalCost * (1 + profitMargin);

    document.getElementById('costoTotal').textContent = totalCost.toFixed(2);
});
