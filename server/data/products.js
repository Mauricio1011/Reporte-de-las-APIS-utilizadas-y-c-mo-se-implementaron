/**
 * Catálogo en memoria. Cada microservicio conserva sus propios datos:
 * el de inventario no lee este arreglo.
 */
const products = [
  {
    id: "P-101",
    title: "Laptop Gamer XYZ",
    description:
      "Portátil de 16 pulgadas con procesador de última generación, 16 GB de RAM y almacenamiento SSD. Pensada para juego y edición.",
    category: "Cómputo",
    price_usd: 1200,
  },
  {
    id: "P-102",
    title: "Audífonos Inalámbricos Pulse",
    description:
      "Cancelación de ruido, 30 horas de batería y estuche de carga. Conexión Bluetooth estable para estudio o viaje.",
    category: "Audio",
    price_usd: 89.99,
  },
  {
    id: "P-103",
    title: "Monitor 27 pulgadas 4K",
    description:
      "Panel IPS de 144 Hz con soporte ajustable en altura. Sirve para diseño, clases y trabajo de oficina.",
    category: "Monitores",
    price_usd: 349.5,
  },
  {
    id: "P-104",
    title: "Teclado Mecánico Ámbar",
    description:
      "Interruptores táctiles, distribución en español y retroiluminación cálida regulable.",
    category: "Periféricos",
    price_usd: 129,
  },
  {
    id: "P-105",
    title: "Mouse Ergonómico Orbit",
    description:
      "Sensor de alta precisión y apoyo para la muñeca, pensado para jornadas largas frente a la computadora.",
    category: "Periféricos",
    price_usd: 59.9,
  },
];

function findProduct(id) {
  return products.find((product) => product.id === id) || null;
}

module.exports = { products, findProduct };
