import {
  aws_cloudwatch,
  aws_events_targets,
  aws_lambda,
  aws_lambda_nodejs,
  Duration
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

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
  ): aws_cloudwatch.Alarm => {
    const metric = this.metricErrors().with({
      statistic: 'Sum',
      period: Duration.minutes(1),
      ...metricOptions
    });

    return this.addAlarm('ErrorsAlarm', {
      alarmDescription: `Over ${errorsPerMinute} errors per minute`,
      metric,
      threshold: errorsPerMinute,
      evaluationPeriods: 3,
      ...createAlarmOptions
    });
  };

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
  ): aws_cloudwatch.Alarm => {
    const metric = this.metricThrottles().with({
      statistic: 'Sum',
      period: Duration.minutes(1),
      ...metricOptions
    });

    return this.addAlarm('ThrottlesAlarm', {
      alarmDescription: `Over ${throttlesPerMinute} throttles per minute`,
      metric,
      threshold: throttlesPerMinute,
      evaluationPeriods: 3,
      ...createAlarmOptions
    });
  };

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

    const metric = this.metricDuration().with({
      statistic: 'p99',
      period: Duration.minutes(1),
      ...metricOptions
    });

    return this.addAlarm('DurationAlarm', {
      alarmDescription: `p99 latency >= ${threshold.toSeconds()}s (${timeoutPercent}% of ${this.timeout.toSeconds()})`,
      metric,
      threshold: threshold.toMilliseconds(),
      evaluationPeriods: 3,
      ...createAlarmOptions
    });
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
  ): aws_cloudwatch.Alarm => {
    const metric = this.metricInvocations().with({
      statistic: 'Sum',
      period: Duration.minutes(1),
      ...metricOptions
    });

    return this.addAlarm('InvocationsAlarm', {
      alarmDescription: `Over ${invocationsPerMinute} invocations per minute`,
      metric,
      threshold: invocationsPerMinute,
      evaluationPeriods: 3,
      ...createAlarmOptions
    });
  };

  /**
   * Creates the alarm resource and adds it to the set of alarms configured for this construct.
   *
   * @param id string
   * @param props {@link aws_cloudwatch.AlarmProps}
   * @returns alarm {@link aws_cloudwatch.Alarm}
   */
  private addAlarm = (id: string, props: aws_cloudwatch.AlarmProps): aws_cloudwatch.Alarm => {
    const alarm = new aws_cloudwatch.Alarm(this, id, props);
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