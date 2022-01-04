import { aws_sqs } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { MonitoredConstruct, type MonitoredConstructProps } from '../aws/monitoredConstruct';

/**
 * Properties used to create the construct.
 *
 * @public
 */
export type QueueProps = MonitoredConstructProps &
  Partial<{
    /**
     * AWS SQS queue properties for the underlying construct.
     *
     * @see {@link aws_sqs.QueueProps}
     */
    queue: aws_sqs.QueueProps;
  }>;

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
  constructor(scope: Construct, id: string, props?: QueueProps) {
    super(scope, id, props);

    // 👇 Create the queue
    this.queue = new aws_sqs.Queue(this, 'queue', props?.queue);

    // 🚨 Configure alarms and alarm actions for the queue
    this.configureAlarms(this.queue);
  }
}
