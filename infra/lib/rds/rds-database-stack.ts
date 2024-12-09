import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  SubnetType,
  SecurityGroup,
  Port,
  Peer,
  InstanceType,
  InstanceClass,
  InstanceSize
} from 'aws-cdk-lib/aws-ec2';
import { DatabaseInstance, DatabaseInstanceEngine, PostgresEngineVersion, Credentials } from 'aws-cdk-lib/aws-rds';
import { SecretValue } from 'aws-cdk-lib';

export interface RdsDatabaseStackProps extends StackProps {
  vpc: Vpc;
  lambdaSecurityGroup: SecurityGroup;
}

export class RdsDatabaseStack extends Stack {
  public readonly dbInstance: DatabaseInstance;

  constructor(scope: Construct, id: string, props: RdsDatabaseStackProps) {
    super(scope, id, props);

    this.dbInstance = new DatabaseInstance(this, 'PostgresDB', {
      engine: DatabaseInstanceEngine.postgres({ version: PostgresEngineVersion.VER_14 }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      credentials: Credentials.fromGeneratedSecret('postgres'),
      allocatedStorage: 20,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      multiAz: false,
      publiclyAccessible: false,
      removalPolicy: RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
    });

    this.dbInstance.connections.allowFrom(props.lambdaSecurityGroup, Port.tcp(5432), 'Allow Lambda to connect to Postgres');
  }
}
