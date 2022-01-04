import { aws_cloudwatch } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export enum AlarmActionType {
  Alarm = 'Alarm',
  Ok = 'Ok',
  InsufficientData = 'InsufficientData'
}

type Alarm = {
  actions?: Partial<Record<AlarmActionType, aws_cloudwatch.IAlarmAction>>;
  metricOptions: aws_cloudwatch.MetricOptions;
  createAlarmOptions: aws_cloudwatch.CreateAlarmOptions;
};

export type Alarms = Record<string, Alarm>;

type ResourceWithMetric = {
  metric(metricName: string, props?: aws_cloudwatch.MetricOptions): aws_cloudwatch.Metric;
};

export type MonitoredConstructProps = Partial<{
  // TODO
  alarms: Alarms;
}>;

/**
 * A new Monitored {@link Construct}.
 * Extending this construct enforces consistent alerting configuration.
 *
 * @public
 */
export class MonitoredConstruct extends Construct {
  // TODO
  private readonly alarms: Alarms;

  /**
   * @param app {@link Construct}
   * @param id string
   * @param props {@link MonitoredConstructProps}
   */
  constructor(app: Construct, id: string, props?: MonitoredConstructProps) {
    super(app, id);

    this.alarms = props?.alarms ?? {};
  }

  configureAlarms = (resource: ResourceWithMetric) => {
    const { alarms } = this;

    if (!alarms) {
      return;
    }

    for (const [metric, { actions, metricOptions, createAlarmOptions }] of Object.entries(alarms)) {
      const alarm = resource
        .metric(metric, metricOptions)
        .createAlarm(this, `${metric}Alarm`, createAlarmOptions);

      if (!actions) {
        break;
      }

      for (const [actionType, action] of Object.entries(actions)) {
        if (actionType === AlarmActionType.Alarm) {
          alarm.addAlarmAction(action);
        }

        if (actionType === AlarmActionType.Ok) {
          alarm.addOkAction(action);
        }

        if (actionType === AlarmActionType.InsufficientData) {
          alarm.addInsufficientDataAction(action);
        }
      }
    }
  };
}