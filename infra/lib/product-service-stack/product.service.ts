export const mockProducts = [
  {
    id: '1',
    title: 'Product 1',
    description: 'Description of Product 1',
    price: 29.99,
    count: 100,
  },
  {
    id: '2',
    title: 'Product 2',
    description: 'Description of Product 2',
    price: 49.99,
    count: 50,
  },
  {
    id: '3',
    title: 'Product 3',
    description: 'Description of Product 3',
    price: 19.99,
    count: 200,
  },
];

export function getAllProducts() {
  return mockProducts;
}

// Function to retrieve a product by ID
export function getProductById(id: string) {
  return mockProducts.find((product) => product.id === id);
}
