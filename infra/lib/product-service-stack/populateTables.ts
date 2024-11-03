import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-west-2' }); // Update with your AWS region

// Define the DynamoDB table names
const productsTable = 'Products';
const stockTable = 'Stock';

// Define the structure of a sample product
interface SampleProduct {
  title: string;
  description: string;
  price: number;
  count: number;
}

// Sample data to insert into Products and Stock tables
const sampleProducts: SampleProduct[] = [
  {
    title: 'Product 1',
    description: 'Description for Product 1',
    price: 100,
    count: 10,
  },
  {
    title: 'Product 2',
    description: 'Description for Product 2',
    price: 200,
    count: 5,
  },
  {
    title: 'Product 3',
    description: 'Description for Product 3',
    price: 300,
    count: 20,
  },
];

// Function to populate the tables with sample data
async function populateTables(): Promise<void> {
  for (const product of sampleProducts) {
    // Generate a unique ID for each product
    const productId = uuidv4();

    // Add product data to Products table
    const productCommand = new PutItemCommand({
      TableName: productsTable,
      Item: {
        id: { S: productId },
        title: { S: product.title },
        description: { S: product.description },
        price: { N: product.price.toString() },
      },
    });

    // Add stock data to Stock table
    const stockCommand = new PutItemCommand({
      TableName: stockTable,
      Item: {
        product_id: { S: productId },
        count: { N: product.count.toString() },
      },
    });

    try {
      await client.send(productCommand);
      console.log(`Added product: ${product.title}`);

      await client.send(stockCommand);
      console.log(`Added stock for product: ${product.title}`);
    } catch (error) {
      console.error('Error adding product/stock:', error);
    }
  }
}

// Run the populateTables function
populateTables().catch((error) => {
  console.error('Error populating tables:', error);
});
