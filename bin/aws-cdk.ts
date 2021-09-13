#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsCdkStack } from '../lib/aws-cdk-stack';

const app = new cdk.App();
new AwsCdkStack(app, 'AwsCdkStack', {
  env: { region: 'us-east-2' },
  envName: 'dev'
});

new AwsCdkStack(app, 'AwsCdkStackProd', {
  env: { region: 'us-west-2' },
  envName: 'prod'
});
