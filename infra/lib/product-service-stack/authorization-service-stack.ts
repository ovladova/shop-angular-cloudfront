import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function for basic authorizer
    const basicAuthorizerLambda = new lambda.Function(
      this,
      'BasicAuthorizerLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handlers.basicAuthorizer',
        code: lambda.Code.fromAsset(path.join(__dirname, './')),
        environment: {
          ovladova: process.env.ovladova || 'TEST_PASSWORD',
        },
      },
    );

    basicAuthorizerLambda.addPermission('APIGatewayInvokePermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:os1p4us77g/authorizers/*`, // Update with your API Gateway ARN
    });

    // Export the Lambda function ARN for use as Authorizer
    new cdk.CfnOutput(this, 'BasicAuthorizerLambdaArn', {
      value: basicAuthorizerLambda.functionArn,
      exportName: 'BasicAuthorizerLambdaArn',
    });
  }
}
