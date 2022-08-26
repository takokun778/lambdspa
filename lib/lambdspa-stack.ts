import { AssetHashType, AssetStaging, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Architecture, Code, Function, FunctionProps, FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { execSync } from 'child_process';
import { Construct } from 'constructs';
import * as path from 'path';

export class LambdspaStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const handler = 'bootstrap';

        const functionProps: FunctionProps = {
            functionName: `${id}-lambda-spa`,
            code: Code.fromAsset(path.join(__dirname, '..', 'lambda'), {
                assetHashType: AssetHashType.OUTPUT,
                bundling: {
                    local: {
                        tryBundle(outputDir: string): boolean {
                            try {
                                execSync('go version', {
                                    stdio: ['ignore', process.stderr, 'inherit'],
                                });
                            } catch {
                                process.stderr.write('not found go');
                                return false;
                            }
                            execSync(
                                [
                                    `GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o ${path.join(
                                        outputDir,
                                        handler
                                    )}`,
                                ].join(' && '),
                                {
                                    stdio: ['ignore', process.stderr, 'inherit'],
                                    cwd: path.join(__dirname, '..', 'lambda'),
                                }
                            );
                            return true;
                        },
                    },
                    image: Runtime.GO_1_X.bundlingImage,
                    command: [
                        'bash',
                        '-c',
                        `GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o ${path.join(
                            AssetStaging.BUNDLING_OUTPUT_DIR,
                            handler
                        )}`,
                    ],
                    user: 'root',
                },
            }),
            architecture: Architecture.ARM_64,
            memorySize: 128,
            runtime: Runtime.PROVIDED_AL2,
            logRetention: RetentionDays.ONE_WEEK,
            timeout: Duration.seconds(10),
            handler,
        };

        const func = new Function(this, `${id}-lambda-spa`, functionProps);

        func.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
        });
    }
}
