import {
  aws_cloudwatch,
  aws_events_targets,
  aws_lambda,
  aws_lambda_nodejs,
  Duration
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export type AddEventSourceMappingWithFilterProps = Omit<
  aws_lambda.EventSourceMappingProps,
  'target'
> & {
  filters: Array<Record<string, unknown>>;
};

export class NodejsFunction extends aws_lambda_nodejs.NodejsFunction {
  /**
   * A set of configured alarms for this construct.
   */
  readonly alarms: Set<aws_cloudwatch.Alarm> = new Set();

  /**
   * @param scope {@link Construct}
   * @param id string
   * @param props {@link aws_lambda_nodejs.NodejsFunctionProps}
   */
  constructor(scope: Construct, id: string, props: aws_lambda_nodejs.NodejsFunctionProps) {
    super(scope, id, {
      ...NodejsFunction.baseLambdaFunctionOptions,
      ...props
    });
  }

  /**
   * Configure alarm actions for all existing monitors.
   *
   * @param actions Array<{@link aws_cloudwatch.IAlarmAction}>
   */
  configureAlarmActions = (...actions: Array<aws_cloudwatch.IAlarmAction>) => {
    for (const alarm of this.alarms) {
      alarm.addAlarmAction(...actions);
    }
  };

  /**
   * Configure ok actions for all existing monitors.
   *
   * @param actions Array<{@link aws_cloudwatch.IAlarmAction}>
   */
  configureOkActions = (...actions: Array<aws_cloudwatch.IAlarmAction>) => {
    for (const alarm of this.alarms) {
      alarm.addOkAction(...actions);
    }
  };

  /**
   * Configure insufficient data actions for all existing monitors.
   *
   * @param actions Array<{@link aws_cloudwatch.IAlarmAction}>
   */
  configureInsufficientDataActions = (...actions: Array<aws_cloudwatch.IAlarmAction>) => {
    for (const alarm of this.alarms) {
      alarm.addInsufficientDataAction(...actions);
    }
  };

  /**
   * Configures an alarm using the errors metric.
   * The default metric period is 1 minute and default alarm evaluation periods is 3.
   *
   * @param errorsPerMinute number @default 0
   * @param metricOptions {@link aws_cloudwatch.MetricOptions}
   * @param createAlarmOptions {@link aws_cloudwatch.CreateAlarmOptions}
   * @returns alarm {@link aws_cloudwatch.Alarm}
   */
  monitorErrors = (
    errorsPerMinute = 0,
    metricOptions?: aws_cloudwatch.MetricOptions,
    createAlarmOptions?: aws_cloudwatch.CreateAlarmOptions
  ): aws_cloudwatch.Alarm =>
    this.configureMonitor(
      'Errors',
      {
        statistic: 'Sum',
        ...metricOptions
      },
      {
        threshold: errorsPerMinute,
        evaluationPeriods: 3,
        ...createAlarmOptions
      }
    );

  /**
   * Configures an alarm using the throttles metric.
   * The default metric period is 1 minute and default alarm evaluation periods is 3.
   *
   * @param throttlesPerMinute number @default 0
   * @param metricOptions {@link aws_cloudwatch.MetricOptions}
   * @param createAlarmOptions {@link aws_cloudwatch.CreateAlarmOptions}
   * @returns alarm {@link aws_cloudwatch.Alarm}
   */
  monitorThrottles = (
    throttlesPerMinute = 0,
    metricOptions?: aws_cloudwatch.MetricOptions,
    createAlarmOptions?: aws_cloudwatch.CreateAlarmOptions
  ): aws_cloudwatch.Alarm =>
    this.configureMonitor(
      'Throttles',
      {
        statistic: 'Sum',
        ...metricOptions
      },
      {
        threshold: throttlesPerMinute,
        evaluationPeriods: 3,
        ...createAlarmOptions
      }
    );

  /**
   * Configures an alarm using the duration metric (p99 % of configured timeout).
   * The default metric period is 1 minute and default alarm evaluation periods is 3.
   *
   * @param timeoutPercent number @default 80
   * @param metricOptions {@link aws_cloudwatch.MetricOptions}
   * @param createAlarmOptions {@link aws_cloudwatch.CreateAlarmOptions}
   * @returns alarm {@link aws_cloudwatch.Alarm}
   */
  monitorDuration = (
    timeoutPercent = 80,
    metricOptions?: aws_cloudwatch.MetricOptions,
    createAlarmOptions?: aws_cloudwatch.CreateAlarmOptions
  ): aws_cloudwatch.Alarm => {
    if (!this.timeout) {
      throw new Error(`timeout not configured for ${this.functionName}`);
    }

    const threshold = Duration.seconds((timeoutPercent / 100) * this.timeout.toSeconds());

    return this.configureMonitor(
      'Duration',
      {
        statistic: 'p99',
        ...metricOptions
      },
      {
        threshold: threshold.toMilliseconds(),
        evaluationPeriods: 3,
        alarmDescription: `p99 latency >= ${threshold.toSeconds()}s (${timeoutPercent}% of ${this.timeout.toSeconds()})`,
        ...createAlarmOptions
      }
    );
  };

  /**
   * Configures an alarm using the invocations metric.
   * The default metric period is 1 minute and default alarm evaluation periods is 3.
   *
   * @param invocationsPerMinute number
   * @param metricOptions {@link aws_cloudwatch.MetricOptions}
   * @param createAlarmOptions {@link aws_cloudwatch.CreateAlarmOptions}
   * @returns alarm {@link aws_cloudwatch.Alarm}
   */
  monitorInvocations = (
    invocationsPerMinute: number,
    metricOptions?: aws_cloudwatch.MetricOptions,
    createAlarmOptions?: aws_cloudwatch.CreateAlarmOptions
  ): aws_cloudwatch.Alarm =>
    this.configureMonitor(
      'Invocations',
      {
        statistic: 'Sum',
        ...metricOptions
      },
      {
        threshold: invocationsPerMinute,
        evaluationPeriods: 3,
        ...createAlarmOptions
      }
    );

  /**
   * Creates the alarm resource using provided metric name and adds it to the set of alarms configured for this construct.
   *
   * @param metricName string
   * @param metricOptions {@link aws_cloudwatch.MetricOptions}
   * @param createAlarmOptions {@link aws_cloudwatch.CreateAlarmOptions}
   * @returns alarm {@link aws_cloudwatch.Alarm}
   */
  private configureMonitor = (
    metricName: string,
    metricOptions: aws_cloudwatch.MetricOptions,
    createAlarmOptions: aws_cloudwatch.CreateAlarmOptions
  ): aws_cloudwatch.Alarm => {
    const metric = this.metric(metricName).with({
      period: Duration.minutes(1),
      ...metricOptions
    });

    const alarmDescription = `Over ${
      createAlarmOptions.threshold
    } ${metricName.toLowerCase()} per ${metric.period.toMinutes()} minutes`;

    const alarm = new aws_cloudwatch.Alarm(this, `${metricName}Alarm`, {
      alarmDescription,
      metric,
      ...createAlarmOptions
    });

    this.alarms.add(alarm);

    return alarm;
  };

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
   * Adds a new event source mapping for the lambda and applies specified filters as `FilterCriteria`.
   * This is a temporary workaround until filtering on streams is supported natively via CDK.
   *
   * @param id string
   * @param props {@link AddEventSourceMappingWithFilterProps}
   */
  addEventSourceMappingWithFilter = (id: string, props: AddEventSourceMappingWithFilterProps) => {
    const eventSourceMapping = new aws_lambda.EventSourceMapping(this, id, {
      target: this,
      ...props
    });

    // Filter criteria for DDB streams not supported yet, use an escape hatch (https://docs.aws.amazon.com/cdk/v2/guide/cfn_layer.html) to get the L1 reference and apply changes
    const {
      node: { defaultChild: cfnEventSourceMapping }
    } = eventSourceMapping;

    (cfnEventSourceMapping as aws_lambda.CfnEventSourceMapping).addPropertyOverride(
      'FilterCriteria',
      {
        Filters: props.filters.map((filter) => JSON.stringify(filter))
      }
    );
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
  };
}
