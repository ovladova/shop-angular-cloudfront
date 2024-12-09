import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import * as path from 'path';
import { Vpc, SecurityGroup, Port, SubnetType, InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { DatabaseInstance, DatabaseInstanceEngine, PostgresEngineVersion, Credentials } from 'aws-cdk-lib/aws-rds';

export class LambdaNestAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a VPC for the application
    const vpc = new Vpc(this, 'AppVPC', {
      maxAzs: 2,
      // Optionally configure subnet types if needed
      // subnetConfiguration: [
      //   { name: 'public', subnetType: SubnetType.PUBLIC },
      //   { name: 'private', subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      // ]
    });

    // Create a Security Group for the Lambda function
    const lambdaSg = new SecurityGroup(this, 'LambdaSG', {
      vpc,
      allowAllOutbound: true,
    });

    // Create the RDS PostgreSQL instance
    const dbInstance = new DatabaseInstance(this, 'PostgresDB', {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_14, // Choose your desired version
      }),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      // Automatically generated credentials in Secrets Manager
      credentials: Credentials.fromGeneratedSecret('postgres'), // 'postgres' username
      allocatedStorage: 20,
      multiAz: false,
      publiclyAccessible: false,
      removalPolicy: RemovalPolicy.DESTROY, // For dev/test only
      deleteAutomatedBackups: true,
    });

    // Allow Lambda SG to access the DB on port 5432
    dbInstance.connections.allowFrom(lambdaSg, Port.tcp(5432), 'Allow Lambda SG to access DB');

    // Now create the Lambda function and place it inside the VPC
    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'NestLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../infra/nodejs-aws-cart-api/src/lambda.ts'),
      handler: 'handler',
      bundling: {
        forceDockerBundling: false,
        externalModules: [
          '@nestjs/microservices',
          '@nestjs/websockets',
          '@nestjs/websockets/socket-module',
          '@nestjs/microservices/microservices-module',
          'class-validator',
          'class-transformer',
        ],
      },
      vpc,
      securityGroups: [lambdaSg],
      environment: {
        // We will fill these after we know the DB details
      },
    });

    // Retrieve DB credentials and endpoint
    const secret = dbInstance.secret; // RDS credentials are stored in a Secret
    const dbEndpoint = dbInstance.instanceEndpoint.hostname;

    // Add environment variables to the Lambda function for DB connection
    if (secret) {
      lambdaFunction.addEnvironment('DB_HOST', dbEndpoint);
      lambdaFunction.addEnvironment('DB_PORT', '5432');
      lambdaFunction.addEnvironment('DB_USER', secret.secretValueFromJson('username').unsafeUnwrap());
      lambdaFunction.addEnvironment('DB_PASSWORD', secret.secretValueFromJson('password').unsafeUnwrap());
      // If you used "postgres" username and didn't set a custom DB name, it might default to "postgres"
      lambdaFunction.addEnvironment('DB_NAME', 'postgres');

      // Grant Lambda permission to read the secret
      secret.grantRead(lambdaFunction);
    }

    // Create the API Gateway and integrate it with the Lambda function
    const api = new apigateway.RestApi(this, 'NestApi', {
      restApiName: 'Nest Service',
      description: 'This service serves a Nest.js application via Lambda.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type','Authorization', 'X-Amz-Date','X-Api-Key','X-Amz-Security-Token','X-Amz-User-Agent'],
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    const apiResource = api.root.addResource('api');
    const profileResource = apiResource.addResource('profile');
    const cartResource = profileResource.addResource('cart');

    cartResource.addMethod('GET', lambdaIntegration);
    cartResource.addMethod('PUT', lambdaIntegration);
    cartResource.addMethod('DELETE', lambdaIntegration);
    cartResource.addMethod('POST', lambdaIntegration);
  }
}
