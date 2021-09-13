import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle
} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as AwsCdk from '../lib/aws-cdk-stack';
import '@aws-cdk/assert/jest';

test('test simple app stack', () => {
  const app = new cdk.App();
  const stack = new AwsCdk.AwsCdkStack(app, 'MyTestStack');
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {
          myBucket5AF9C99B: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                  {
                    ServerSideEncryptionByDefault: {
                      SSEAlgorithm: 'AES256'
                    }
                  }
                ]
              }
            },
            UpdateReplacePolicy: 'Retain',
            DeletionPolicy: 'Retain'
          }
        },
        Outputs: {
          bucketExport: {
            Value: 'myBucketExportName'
          }
        }
      },
      MatchStyle.EXACT
    )
  );
});

test('test stack has a s3', () => {
  const app = new cdk.App();
  const stack = new AwsCdk.AwsCdkStack(app, 'MyTestStack');
  expect(stack).toHaveResource('AWS::S3::Bucket');
});
