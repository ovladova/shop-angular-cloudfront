import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function for /products
    const getProductsListLambda = new lambda.Function(
      this,
      'getProductsListLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.getProductsList',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
      },
    );

    // Lambda function for /products/{productId}
    const getProductByIdLambda = new lambda.Function(
      this,
      'getProductByIdLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.getProductsById',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
      },
    );

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

    // Endpoint /products
    const productsResource = api.root.addResource('products');
    productsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsListLambda),
    );

    // Endpoint /products/{productId}
    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductByIdLambda),
    );
  }
}
