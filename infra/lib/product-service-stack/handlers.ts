import { getAllProducts, getProductById } from './product.service';

// Lambda function to retrieve the full array of products
export async function getProductsList() {
  const products = getAllProducts();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(products),
  };
}

// Lambda function to retrieve a single product by ID
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProductsById(event: any) {
  const productId = event.pathParameters.productId;
  const product = getProductById(productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message: 'Product not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(product),
  };
}
