import { aws_sqs } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { MonitoredConstruct, type MonitoredConstructProps } from '../aws/monitoredConstruct';

/**
 * {@link aws_sqs.QueueProps} + {@link MonitoredConstructProps}.
 *
 * @public
 */
export type QueueProps = MonitoredConstructProps & aws_sqs.QueueProps;

export class Queue extends MonitoredConstruct {
  /**
   * The underlying {@link aws_sqs.Queue} construct.
   *
   * @public
   * @readonly
   */
  public readonly queue: aws_sqs.Queue;

  /**
   * @param app {@link Construct}
   * @param id string
   * @param props {@link QueueProps}
   */
  constructor(scope: Construct, id: string, { alarms, ...rest }: QueueProps) {
    super(scope, id, { alarms });

    // 👇 Create the queue
    this.queue = new aws_sqs.Queue(this, 'queue', rest);

    // 🚨 Configure alarms and alarm actions for the queue
    this.configureAlarms(this.queue);
  }
}
