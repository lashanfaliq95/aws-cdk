import { ARecord, IPublicHostedZone, RecordTarget } from '@aws-cdk/aws-route53';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as Lambda from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from '@aws-cdk/aws-lambda';
import { S3Origin } from '@aws-cdk/aws-cloudfront-origins';
import path from 'path';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets';
import { HttpApi, HttpMethod, CorsHttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import {
  CloudFrontWebDistribution,
  Distribution
} from '@aws-cdk/aws-cloudfront';
import { ICertificate } from '@aws-cdk/aws-certificatemanager';

interface SimpleStackProps extends cdk.StackProps {
  envName?: string;
  hostedZone: IPublicHostedZone;
  certificate: ICertificate;
  dns: string;
}

export class AwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: SimpleStackProps) {
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

    const cloudFront = new Distribution(this, 'simpleappdistrubuto', {
      defaultBehavior: { origin: new S3Origin(websiteBucket) },
      domainNames: [props.dns],
      certificate: props.certificate
    });

    new ARecord(this, 'simplerecordapex', {
      zone: props.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFront))
    });

    const cloudFront1 = new CloudFrontWebDistribution(this, 'appDistribution', {
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
