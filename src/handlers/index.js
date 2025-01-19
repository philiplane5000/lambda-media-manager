import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Normalizes a directory prefix string by removing leading/trailing slashes and whitespace
 * @param {string} rawPrefix - The raw prefix string to normalize (e.g., '/folder/', '  folder  ', '///folder///')
 * @returns {string} Normalized prefix with single trailing slash if prefix exists (e.g., 'folder/') or empty string
 */
const _normalizePrefix = rawPrefix => {
    if (!rawPrefix) return '';
    const cleanPrefix = rawPrefix.trim().replace(/^\/+|\/+$/g, '');
    return cleanPrefix ? `${cleanPrefix}/` : '';
};

/**
 * Filters S3 objects based on storage class, size, and file extension
 * @param {Object} object - S3 object metadata
 * @param {string} object.Key - Object key in S3
 * @param {number} object.Size - Object size in bytes
 * @param {string} object.StorageClass - S3 storage class
 * @param {string} fileExtension - File extension to filter by
 * @returns {boolean} Whether the object passes all filters
 */
const _filterS3Objects = ({ Key, Size, StorageClass }, fileExtension) => {
    return StorageClass !== 'GLACIER' && parseInt(Size) > 0 && Key.endsWith(fileExtension);
};

let response;

/**
* Lambda handler for S3 presigned URL generation
* @see https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-proxy-integration.html
* @param {Object} event - API Gateway event
* @returns {Object} API Gateway response
*/
const handler = async event => {
    const BUCKET_NAME = process.env.TARGET_BUCKET_NAME ?? 'philips-glacier';

    // Extract query parameters for flexibility
    const queryParams = event.queryStringParameters ?? {};
    const {
        prefix = '', // Optional subdirectory
        max = 50, // Default number of items
        fileExtension = '',
    } = queryParams;

    const SUB_DIRECTORY = _normalizePrefix(prefix);
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
            Contents.filter(object => _filterS3Objects(object, FILE_EXT)).map(async ({ Key }) => {
                const command = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key,
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

export default handler;
