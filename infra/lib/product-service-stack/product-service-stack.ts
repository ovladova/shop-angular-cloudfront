import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

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

    // Grant permissions for Lambdas to read/write from the tables
    productsTable.grantReadData(getProductsListLambda);
    productsTable.grantReadData(getProductByIdLambda);
    productsTable.grantWriteData(createProductLambda);
    stockTable.grantReadData(getProductsListLambda);
    stockTable.grantReadData(getProductByIdLambda);
    stockTable.grantWriteData(createProductLambda);

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
