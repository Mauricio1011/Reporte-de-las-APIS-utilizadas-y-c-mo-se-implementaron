/**
 * Existencias por almacén. El identificador coincide con el catálogo,
 * pero este servicio no consulta precios ni nombres.
 */
const inventory = [
  {
    product_id: "P-101",
    available_units: 15,
    warehouse: "Chihuahua Norte",
    location: "Pasillo A-12",
    estimated_delivery_days: 2,
  },
  {
    product_id: "P-102",
    available_units: 4,
    warehouse: "Chihuahua Norte",
    location: "Pasillo B-03",
    estimated_delivery_days: 3,
  },
  {
    product_id: "P-103",
    available_units: 0,
    warehouse: "Juárez Centro",
    location: "Andén 4",
    estimated_delivery_days: null,
  },
  {
    product_id: "P-104",
    available_units: 42,
    warehouse: "Chihuahua Sur",
    location: "Rack C-18",
    estimated_delivery_days: 1,
  },
  {
    product_id: "P-105",
    available_units: 8,
    warehouse: "Chihuahua Sur",
    location: "Rack C-02",
    estimated_delivery_days: 2,
  },
];

function stockStatus(availableUnits) {
  if (availableUnits <= 0) return "OUT_OF_STOCK";
  if (availableUnits <= 5) return "LOW_STOCK";
  return "IN_STOCK";
}

function findInventory(productId) {
  const record = inventory.find((item) => item.product_id === productId);
  if (!record) return null;
  return {
    ...record,
    stock_status: stockStatus(record.available_units),
    estimated_delivery_days:
      record.available_units > 0 ? record.estimated_delivery_days : null,
  };
}

module.exports = { inventory, findInventory, stockStatus };
