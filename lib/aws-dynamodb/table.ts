import { aws_dynamodb } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { type MonitoredConstructProps, configureAlarms } from '../aws/monitoredConstruct';

/**
 * {@link aws_dynamodb.TableProps} + {@link MonitoredConstructProps}.
 *
 * @public
 */
export type TableProps = MonitoredConstructProps & aws_dynamodb.TableProps;

/**
 * The underlying {@link aws_dynamodb.Table} construct.
 *
 * @public
 * @readonly
 */
export class Table extends aws_dynamodb.Table {
  /**
   * @param app {@link Construct}
   * @param id string
   * @param props {@link TableProps}
   */
  constructor(scope: Construct, id: string, { alarms, ...rest }: TableProps) {
    super(scope, id, rest);
    configureAlarms(this, alarms);
  }
}
