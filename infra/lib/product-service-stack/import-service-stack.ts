import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the S3 bucket for importing files
    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Import the SQS queue
    const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
    const catalogItemsQueueUrl = cdk.Fn.importValue('CatalogItemsQueueUrl');
    const catalogItemsQueue = sqs.Queue.fromQueueAttributes(
      this,
      'CatalogItemsQueue',
      {
        queueArn: catalogItemsQueueArn,
        queueUrl: catalogItemsQueueUrl,
      },
    );

    // Define the Lambda function for importing files
    const importProductsFileLambda = new lambda.Function(
      this,
      'ImportProductsFileLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.importProductsFile',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          CATALOG_ITEMS_QUEUE_URL: catalogItemsQueueUrl,
        },
      },
    );

    // Grant S3 permissions to the Lambda function
    importBucket.grantReadWrite(importProductsFileLambda);

    // Define IAM policy for generating signed URLs
    importProductsFileLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`${importBucket.bucketArn}/uploaded/*`],
      }),
    );

    // Define the Lambda function for parsing imported files
    const importFileParserLambda = new lambda.Function(
      this,
      'ImportFileParserLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.importFileParser',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          CATALOG_ITEMS_QUEUE_URL: catalogItemsQueueUrl,
        },
      },
    );

    // Grant S3 read permissions to the parser Lambda
    importBucket.grantRead(importFileParserLambda);

    // Grant permission to send messages to the SQS queue
    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    // Set up S3 trigger for the `uploaded/` folder in the import bucket
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded/' },
    );

    // API Gateway setup for the Import Service
    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service',
      description: 'This service handles product import operations.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Import the Basic Authorizer Lambda function ARN
    const basicAuthorizerLambdaArn = cdk.Fn.importValue(
      'BasicAuthorizerLambdaArn',
    );
    const basicAuthorizer = new apigateway.TokenAuthorizer(
      this,
      'ImportAuthorizer',
      {
        handler: lambda.Function.fromFunctionArn(
          this,
          'BasicAuthorizer',
          basicAuthorizerLambdaArn,
        ),
      },
    );

    // Add /import endpoint to API Gateway with authorizer
    const importResource = api.root.addResource('import');
    importResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsFileLambda),
      {
        authorizer: basicAuthorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      },
    );

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ImportApiUrl', {
      value: api.url,
      description: 'URL of the Import Service API',
    });
  }
}
