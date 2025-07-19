import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { filterObjects } from '../utils';

const BUCKET_NAME = process.env.TARGET_BUCKET_NAME ?? 'philips-glacier';

/**
 * Filters S3 objects based on storage class, size, and file extension
 * @param {Object} object - S3 object metadata
 * @param {number} object.Size - Object size in bytes
 * @param {string} object.StorageClass - S3 storage class
 * @returns {boolean} Whether the object passes all filters
 */
const _filterS3Objects = ({ Size, StorageClass }) => {
    return StorageClass === 'STANDARD' && parseInt(Size) > 0;
};

/**
 * Lists objects in S3 bucket with optional filtering
 * @param {Object} event - API Gateway event
 * @param {Object} event.queryStringParameters - Query string parameters
 * @param {string} [event.queryStringParameters.prefix=''] - Filter objects by prefix
 * @param {number} [event.queryStringParameters.limit=50] - Maximum number of objects to return
 * @returns {Promise<Object>} Filtered contents and continuation token
 * @throws {Error} If invalid limit or S3 errors
 */
const listMedia = async event => {
    // TODO: Implement request validators in API Gateway
    // const MAX_LIMIT = 1000;
    const {
        prefix = '', // Optional filter
        limit = 50, // Default number of items
    } = event.queryStringParameters ?? {};

    try {
        if (isNaN(Number(limit))) {
            throw new Error('Invalid limit paramter');
        }

        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: Number(limit),
            Prefix: prefix,
        });

        const client = new S3Client({ region: 'us-east-1' });
        const { Contents = [], NextContinuationToken } = await client.send(listCommand);

        return {
            contents: Contents.filter(_filterS3Objects),
            nextToken: NextContinuationToken,
        };
    } catch (err) {
        console.error('[listMedia] error: ', err);
        throw err;
    }
};

/**
 * Generates a presigned URL for retrieving an S3 object
 * @param {Object} event - API Gateway event
 * @param {Object} event.pathParameters - URL path parameters
 * @param {string} event.pathParameters.key - S3 object key
 * @returns {Promise<Object>} Object containing key, presigned URL and expiry time
 * @throws {Error} If object not found or other S3 errors
 */
const getMedia = async event => {
    // TODO: Implement request validators in API Gateway
    const EXPIRES_IN = 3600 * 24; // 24 hours
    const { key } = event.pathParameters;

    try {
        const client = new S3Client({ region: 'us-east-1' });

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        // check if object exists to avoid generating invalid URLs
        await client.send(command);
        const presigned = await getSignedUrl(client, command, { expiresIn: EXPIRES_IN });

        return {
            key: key,
            url: presigned,
            expiresIn: EXPIRES_IN,
        };
    } catch (err) {
        console.error('[getMedia] error: ', err);
        throw err;
    }
};

/**
 * Lambda handler for S3 presigned URL generation
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-proxy-integration.html
 * @param {Object} event - API Gateway event
 * @returns {Object} API Gateway response
 */
const handler = async event => {
    const { resource, httpMethod } = event;
    let result;

    try {
        switch (`${httpMethod}:${resource}`) {
            case 'GET:/media':
                result = await listMedia(event);
                break;
            case 'GET:/media/{key}':
                result = await getMedia(event);
                break;
            default:
                throw new Error('Resource Not Found...');
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://vault.philiplane.io',
                'Access-Control-Allow-Methods': 'GET',
            },
            body: JSON.stringify({ message: 'success', ...result }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message ? err.message : 'Something went wrong...' }),
        };
    }
};

export default handler;
