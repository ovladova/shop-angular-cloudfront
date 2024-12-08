import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing Products DynamoDB table
    const productsTable = dynamodb.Table.fromTableName(
      this,
      'Products',
      'Products',
    );

    // Import existing Stock DynamoDB table
    const stockTable = dynamodb.Table.fromTableName(this, 'Stock', 'Stock');

    // Create the SQS queue
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
    });

    // Define the getProductsList Lambda function
    const getProductsListLambda = new lambda.Function(
      this,
      'getProductsListLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.getProductsList',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCK_TABLE: stockTable.tableName,
        },
      },
    );

    // Define the getProductsById Lambda function
    const getProductByIdLambda = new lambda.Function(
      this,
      'getProductByIdLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.getProductsById',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCK_TABLE: stockTable.tableName,
        },
      },
    );

    // Define the createProduct Lambda function
    const createProductLambda = new lambda.Function(
      this,
      'createProductLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.createProduct',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCK_TABLE: stockTable.tableName,
        },
      },
    );

    // Create the SNS topic
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic',
    });

    // Add an email subscription to the SNS topic
    createProductTopic.addSubscription(
      new subs.EmailSubscription('ooollya@gmail.com'),
    );

    // Update the catalogBatchProcess Lambda function
    const catalogBatchProcessLambda = new lambda.Function(
      this,
      'catalogBatchProcessLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.catalogBatchProcess',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(10),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCK_TABLE: stockTable.tableName,
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
        },
      },
    );

    // Grant permissions for Lambdas to read/write from the tables
    productsTable.grantReadData(getProductsListLambda);
    productsTable.grantReadData(getProductByIdLambda);
    productsTable.grantWriteData(createProductLambda);
    stockTable.grantReadData(getProductsListLambda);
    stockTable.grantReadData(getProductByIdLambda);
    stockTable.grantWriteData(createProductLambda);
    productsTable.grantWriteData(catalogBatchProcessLambda);
    stockTable.grantWriteData(catalogBatchProcessLambda);
    createProductTopic.grantPublish(catalogBatchProcessLambda);

    // Configure SQS to trigger the Lambda function with batch size 5
    const eventSource = new lambdaEventSources.SqsEventSource(
      catalogItemsQueue,
      {
        batchSize: 5,
      },
    );

    catalogBatchProcessLambda.addEventSource(eventSource);

    // Export the SQS queue ARN and URL
    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
      value: catalogItemsQueue.queueUrl,
      exportName: 'CatalogItemsQueueUrl',
    });

    // API Gateway setup
    const api = new apigateway.RestApi(this, 'ProductServiceApi', {
      restApiName: 'Product Service',
      description: 'This service serves product data.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // /products endpoint for GET method
    const productsResource = api.root.addResource('products');
    productsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsListLambda),
    );
    productsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createProductLambda),
    );

    // /products/{productId} endpoint for GET method
    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductByIdLambda),
    );
  }
}
