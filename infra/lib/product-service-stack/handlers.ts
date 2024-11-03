import { Handler } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

const dynamoDB = new DynamoDBClient({ region: 'us-west-2' });
const productsTable = process.env.PRODUCTS_TABLE || 'Products';
const stockTable = process.env.STOCK_TABLE || 'Stock';

// Lambda function to retrieve the full array of products
export const getProductsList: Handler = async () => {
  try {
    const productsResponse = await dynamoDB.send(
      new ScanCommand({ TableName: productsTable }),
    );
    const stockResponse = await dynamoDB.send(
      new ScanCommand({ TableName: stockTable }),
    );

    const products = productsResponse.Items || [];
    const stockData = stockResponse.Items || [];

    // Join products with stock data
    const productsWithStock = products.map((product) => {
      const stock = stockData.find(
        (item) => item.product_id?.S === product.id?.S,
      );
      return {
        id: product.id?.S || '',
        title: product.title?.S || '',
        description: product.description?.S || '',
        price: parseInt(product.price?.N || '0', 10),
        count: stock ? parseInt(stock.count?.N || '0', 10) : 0,
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(productsWithStock),
    };
  } catch (error) {
    console.error('Error retrieving products:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Failed to retrieve products' }),
    };
  }
};

// Lambda function to retrieve a single product by ID
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getProductsById: Handler = async (event) => {
  try {
    const productId = event.pathParameters?.productId;

    // Retrieve product data from the Products table
    const productResponse = await dynamoDB.send(
      new GetItemCommand({
        TableName: productsTable,
        Key: { id: { S: productId } },
      }),
    );

    const product = productResponse.Item;

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

    // Retrieve stock data from the Stock table
    const stockResponse = await dynamoDB.send(
      new GetItemCommand({
        TableName: stockTable,
        Key: { product_id: { S: productId } },
      }),
    );
    const stock = stockResponse.Item;

    // Construct the product with stock information
    const productWithStock = {
      id: product.id?.S || '',
      title: product.title?.S || '',
      description: product.description?.S || '',
      price: parseInt(product.price?.N || '0', 10),
      count: stock ? parseInt(stock.count?.N || '0', 10) : 0,
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(productWithStock),
    };
  } catch (error) {
    console.error('Error retrieving product by ID:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Failed to retrieve product' }),
    };
  }
};
