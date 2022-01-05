import { aws_apigateway, aws_lambda } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export enum RestApiMethod {
  OPTIONS = 'OPTIONS',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  GET = 'GET',
  DELETE = 'DELETE'
}

export type AddLambdaIntegrationOptions = aws_apigateway.MethodOptions & {
  body: any;
  path: string;
  method: RestApiMethod;
};

export class RestApi extends aws_apigateway.RestApi {
  public readonly requestValidator: aws_apigateway.RequestValidator;

  constructor(scope: Construct, id: string, props: aws_apigateway.RestApiProps) {
    super(scope, id, props);

    this.requestValidator = this.addRequestValidator('RequestValidator', {
      validateRequestBody: true,
      validateRequestParameters: true
    });
  }

  addLambdaIntegration = (lambda: aws_lambda.Function, options: AddLambdaIntegrationOptions) => {
    // 👇 Create the Lambda <> API GW integration
    const lambdaIntegration = new aws_apigateway.LambdaIntegration(lambda);

    // 👇 Configure default options
    const defaultMethodOptions: aws_apigateway.MethodOptions = {
      requestValidator: this.requestValidator
    };

    // 👇 Add request models configuration to method options if schema provided
    if (options.body) {
      const model = new aws_apigateway.Model(this, 'RequestModel' + lambda.node.id, {
        restApi: this,
        contentType: 'application/json',
        schema: options.body
      });

      Object.assign(defaultMethodOptions, {
        requestModels: {
          'application/json': model
        }
      });
    }

    // 👇 Get or create the resource up to the path
    const resource = this.root.resourceForPath(options.path);

    // 👇 Link the method with the lambda integration and method options
    return resource.addMethod(options.method, lambdaIntegration, {
      ...defaultMethodOptions,
      ...options
    });
  };
}
