import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as Lambda from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from '@aws-cdk/aws-lambda';
import path from 'path';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { HttpApi, HttpMethod, CorsHttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { CloudFrontWebDistribution } from '@aws-cdk/aws-cloudfront';

interface SimpleStackProps extends cdk.StackProps {
  envName: string;
}

export class AwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: SimpleStackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'myBucket', {
      encryption:
        props?.envName === 'prod'
          ? BucketEncryption.S3_MANAGED
          : BucketEncryption.UNENCRYPTED
    });

    new BucketDeployment(this, 'myPhotos', {
      sources: [Source.asset(path.join(__dirname, '..', 'photos'))],
      destinationBucket: bucket
    });

    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    });

    const cloudFront = new CloudFrontWebDistribution(this, 'appDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: websiteBucket
          },
          behaviors: [{ isDefaultBehavior: true }]
        }
      ]
    });

    new BucketDeployment(this, 'DeploySimpleApp', {
      sources: [Source.asset(path.join(__dirname, '..', 'frontend', 'build'))],
      destinationBucket: websiteBucket,
      distribution: cloudFront
    });

    const myLambda = new Lambda.NodejsFunction(this, 'mySimpleLambda', {
      runtime: Runtime.NODEJS_14_X,
      entry: path.join(__dirname, '../api/get-photos/index.ts'),
      handler: 'getPhotos',
      environment: {
        PHOTO_BUCKET_NAME: bucket.bucketName
      }
    });

    const bucketContainerPermissions = new PolicyStatement();
    bucketContainerPermissions.addResources(bucket.bucketArn);
    bucketContainerPermissions.addActions('s3:ListBucket');

    const bucketPermission = new PolicyStatement();
    bucketPermission.addResources(`${bucket.bucketArn}/*`);
    bucketPermission.addActions('s3:GetObject', 's3:PutObject');

    myLambda.addToRolePolicy(bucketContainerPermissions);
    myLambda.addToRolePolicy(bucketPermission);

    const httpAPi = new HttpApi(this, 'MySimpleHttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.GET]
      },
      apiName: 'photo-api',
      createDefaultStage: true
    });

    const lambdaProxyInt = new LambdaProxyIntegration({ handler: myLambda });

    httpAPi.addRoutes({
      path: '/getAllPhotos',
      methods: [HttpMethod.GET],
      integration: lambdaProxyInt
    });

    new cdk.CfnOutput(this, 'bucketExport', {
      value: 'myBucketExportName'
    });

    new cdk.CfnOutput(this, 'MySimpleApi', {
      value: httpAPi.url!,
      exportName: 'MySimpleAppAPiEndpoint'
    });

    new cdk.CfnOutput(this, 'SimpleAppExport', {
      value: websiteBucket.bucketName,
      exportName: 'websitebucket'
    });

    new cdk.CfnOutput(this, 'Websiteurl', {
      value: cloudFront.distributionDomainName,
      exportName: 'mysimpleappwebsireurl'
    });
  }
}
