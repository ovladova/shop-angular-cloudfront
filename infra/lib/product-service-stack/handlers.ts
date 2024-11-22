import {
  Handler,
  APIGatewayProxyEvent,
  S3Event,
  S3Handler,
  SQSEvent,
} from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import * as csv from 'csv-parser';
import * as stream from 'stream';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const pipeline = promisify(stream.pipeline);

const dynamoDB = new DynamoDBClient({ region: 'us-west-2' });
const productsTable = process.env.PRODUCTS_TABLE || 'Products';
const stockTable = process.env.STOCK_TABLE || 'Stock';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'us-west-2' });
const bucketName = process.env.BUCKET_NAME || '';

const sqsClient = new SQSClient({ region: 'us-west-2' });
const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL || '';

const snsClient = new SNSClient({ region: 'us-west-2' });

export const catalogBatchProcess: Handler = async (event: SQSEvent) => {
  const topicArn = process.env.CREATE_PRODUCT_TOPIC_ARN || '';

  for (const record of event.Records) {
    try {
      const product = JSON.parse(record.body);

      const { title, description, price, count } = product;

      if (!title || !price || count === undefined) {
        console.error('Invalid product data:', product);
        continue;
      }

      const productId = uuidv4();

      // Add product data to the Products table
      const productCommand = new PutItemCommand({
        TableName: productsTable,
        Item: {
          id: { S: productId },
          title: { S: title },
          description: { S: description || '' },
          price: { N: price.toString() },
        },
      });
      await dynamoDB.send(productCommand);

      // Add stock data to the Stock table
      const stockCommand = new PutItemCommand({
        TableName: stockTable,
        Item: {
          product_id: { S: productId },
          count: { N: count.toString() },
        },
      });
      await dynamoDB.send(stockCommand);

      console.log(`Successfully processed product: ${title}`);

      // Publish a message to the SNS topic
      await snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Subject: 'New Product Created',
          Message: `Product ${title} has been created with ID ${productId}.`,
          MessageAttributes: {
            price: {
              DataType: 'Number',
              StringValue: price.toString(),
            },
          },
        }),
      );

      console.log(`SNS message sent for product: ${title}`);
    } catch (error) {
      console.error('Error processing SQS message:', error);
    }
  }
};

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

// Lambda function to create a product
export const createProduct: Handler = async (event) => {
  try {
    const { title, description, price, count } = JSON.parse(event.body || '{}');

    if (!title || !price || count === undefined) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({
          message: 'Title, price, and count are required fields.',
        }),
      };
    }

    const productId = uuidv4();

    // Add product data to the Products table
    const productCommand = new PutItemCommand({
      TableName: productsTable,
      Item: {
        id: { S: productId },
        title: { S: title },
        description: { S: description || '' },
        price: { N: price.toString() },
      },
    });
    await dynamoDB.send(productCommand);

    // Add stock data to the Stock table
    const stockCommand = new PutItemCommand({
      TableName: stockTable,
      Item: {
        product_id: { S: productId },
        count: { N: count.toString() },
      },
    });
    await dynamoDB.send(stockCommand);

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        message: 'Product created successfully',
        id: productId,
      }),
    };
  } catch (error) {
    console.error('Error creating product:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Error creating product' }),
    };
  }
};

// Lambda function to generate a signed URL for uploading a file
export const importProductsFile: Handler = async (
  event: APIGatewayProxyEvent,
) => {
  try {
    // Extract the file name from query string parameters
    const fileName = event.queryStringParameters?.name;
    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'File name is required as a query parameter',
        }),
      };
    }

    // Define the S3 key with the "uploaded/" prefix
    const fileKey = `uploaded/${fileName}`;

    // Generate a signed URL for PUT operation
    const signedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: 'text/csv', // Assuming CSV files for product data
      }),
      { expiresIn: 3600 },
    ); // URL valid for 1 hour

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
      body: JSON.stringify({ signedUrl }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to generate signed URL' }),
    };
  }
};

export const importFileParser: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const objectKey = record.s3.object.key;

    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await s3Client.send(getObjectCommand);

      await pipeline(
        response.Body as stream.Readable,
        csv(),
        new stream.Writable({
          objectMode: true,
          async write(data, _, callback) {
            try {
              console.log('Sending message to SQS:', data);
              await sqsClient.send(
                new SendMessageCommand({
                  QueueUrl: queueUrl,
                  MessageBody: JSON.stringify(data),
                }),
              );
              callback();
            } catch (err) {
              console.error('Error sending message to SQS:', err);
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              callback(err);
            }
          },
        }),
      );

      console.log(
        'Completed parsing and sending messages for file:',
        objectKey,
      );
    } catch (error) {
      console.error(`Error processing file ${objectKey}:`, error);
    }
  }
};
