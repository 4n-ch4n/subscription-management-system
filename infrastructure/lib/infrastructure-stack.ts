import * as cdk from 'aws-cdk-lib/core';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DbCredentialsSecret',
      'prod/subscription-db-credentials',
    );

    const renewSubscriptionsLambda = new lambdaNodejs.NodejsFunction(
      this,
      'RenewSubscriptionsLambda',
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        code: lambda.Code.fromAsset('src/lambdas/renewSubscriptions.ts'),
        handler: 'handler',
        timeout: cdk.Duration.minutes(5),
        memorySize: 512,
        environment: {
          NODE_ENV: 'production',
          SECRET_NAME: dbSecret.secretName,
        },
      },
    );
    dbSecret.grantRead(renewSubscriptionsLambda);

    const expireSubscriptionsLambda = new lambdaNodejs.NodejsFunction(
      this,
      'ExpireSubscriptionsLambda',
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        code: lambda.Code.fromAsset('src/lambdas/expireSubscriptions.ts'),
        handler: 'handler',
        timeout: cdk.Duration.minutes(5),
        memorySize: 512,
        environment: {
          NODE_ENV: 'production',
          SECRET_NAME: dbSecret.secretName
        },
      },
    );
    dbSecret.grantRead(expireSubscriptionsLambda);

    const renewRule = new events.Rule(this, 'RenewSubscriptionsRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '0' }),
    });
    renewRule.addTarget(new targets.LambdaFunction(renewSubscriptionsLambda));

    const expireRule = new events.Rule(this, 'ExpireSubscriptionsRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '1' }),
    });
    expireRule.addTarget(new targets.LambdaFunction(expireSubscriptionsLambda));
  }
}
