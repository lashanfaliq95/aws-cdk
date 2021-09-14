#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsCdkStack } from '../lib/aws-cdk-stack';
import { AwsAPPStackDns } from '../lib/aws-cdk-dngstack';

const domainNameApex = 'lashan.me';
const app = new cdk.App();
const { hostedZone, certificate } = new AwsAPPStackDns(app, 'AwsAppstack', {
  dnsName: domainNameApex
});

new AwsCdkStack(app, 'AwsCdkStack', {
  hostedZone,
  certificate,
  dns: domainNameApex
});
