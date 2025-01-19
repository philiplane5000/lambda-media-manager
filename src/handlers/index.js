import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let response;
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const handler = async (event, context) => {
    const BUCKET_NAME = process.env.TARGET_BUCKET_NAME ?? 'philips-glacier';

    // Extract query parameters for flexibility
    const queryParams = event.queryStringParameters || {};
    const {
        prefix = '', // Optional subdirectory
        max = 50, // Default number of items
        fileExtension = '', // TODO: explore usage of mime type instead?
        // nextToken, // For pagination
    } = queryParams;

    const SUB_DIRECTORY = prefix !== '' ? `${prefix}/` : '';
    const FILE_EXT = fileExtension;

    try {
        const client = new S3Client({ region: 'us-east-1' });

        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: SUB_DIRECTORY,
            MaxKeys: Number(max),
        });

        const { Contents = [] } = await client.send(listCommand);

        const presignedUrls = await Promise.all(
            Contents.filter(({ Key, Size, StorageClass }) => {
                return StorageClass !== 'GLACIER' && parseInt(Size) > 0 && Key.endsWith(FILE_EXT);
            }).map(async ({ Key, Size, StorageClass }) => {
                const command = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: Key,
                });

                const presignedUrl = await getSignedUrl(client, command, {
                    expiresIn: 3600 * 6, // 3600 = 1hr
                });

                return {
                    key: Key,
                    url: presignedUrl,
                };
            })
        );

        response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'success',
                contents: presignedUrls,
            }),
        };
    } catch (err) {
        console.log(err);
        return err;
    }

    return response;
};
