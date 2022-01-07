import { aws_events_targets, aws_lambda, aws_lambda_nodejs, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class NodejsFunction extends aws_lambda_nodejs.NodejsFunction {
  constructor(scope: Construct, id: string, props: aws_lambda_nodejs.NodejsFunctionProps) {
    super(scope, id, {
      ...NodejsFunction.baseLambdaFunctionOptions,
      ...props
    });
  }

  /**
   * Creates a new {@link aws_events_targets.LambdaFunction}
   *
   * @param props {@link aws_events_targets.LambdaFunctionProps}
   * @returns target {@link aws_events_targets.LambdaFunction}
   */
  eventTarget = (
    props?: aws_events_targets.LambdaFunctionProps
  ): aws_events_targets.LambdaFunction => {
    if (!props?.deadLetterQueue) {
      console.warn(`deadLetterQueue not configured for ${this.functionName} event target`);
    }

    return new aws_events_targets.LambdaFunction(this, props);
  };

  /**
   * Options used as the base for all {@link NodejsFunction} constructs.
   */
  static baseLambdaFunctionOptions: aws_lambda_nodejs.NodejsFunctionProps = {
    environment: {},
    memorySize: 1024,
    tracing: aws_lambda.Tracing.ACTIVE,
    timeout: Duration.seconds(5),
    retryAttempts: 2,
    reservedConcurrentExecutions: 1,
    logRetention: Duration.days(7).toDays(),
    insightsVersion: aws_lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    bundling: {
      externalModules: [
        'aws-sdk' // Use the 'aws-sdk' available in the Lambda runtime
      ]
    }
    // depsLockFilePath: join(nodePath, 'functions/package-lock.json')
  };
}
