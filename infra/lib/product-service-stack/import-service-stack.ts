import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the S3 bucket
    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Define the Lambda function for importing files
    const importProductsFileLambda = new lambda.Function(
      this,
      'importProductsFileLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.importProductsFile',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
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

    // Define the importFileParser Lambda function
    const importFileParserLambda = new lambda.Function(
      this,
      'importFileParserLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.importFileParser',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
      },
    );

    // Grant S3 read permissions to the importFileParser Lambda
    importBucket.grantRead(importFileParserLambda);

    // Set up S3 trigger for the uploaded folder in the import bucket
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded/' },
    );

    // API Gateway setup for the import endpoint
    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service',
      description: 'This service handles product import operations.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // /import endpoint for GET method
    const importResource = api.root.addResource('import');
    importResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsFileLambda),
    );

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ImportApiUrl', {
      value: api.url,
      description: 'URL of the Import Service API',
    });
  }
}
