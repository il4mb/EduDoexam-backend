import { Storage } from '@google-cloud/storage';

// Validate environment variables
const REQUIRED_ENV_VARS = ['GCLOUD_PROJECT_ID', 'GCLOUD_PROJECT_SERVICE_JSON', 'GCLOUD_STORAGE_BUCKET'];
REQUIRED_ENV_VARS.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

// Initialize Storage
const storage = new Storage({
    projectId: process.env.GCLOUD_PROJECT_ID,
    keyFilename: `./${process.env.GCLOUD_PROJECT_SERVICE_JSON}`,
});
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET || '');

/**
 * Uploads a file to Google Cloud Storage.
 * @param {Object} file - The file object (e.g., from a request).
 * @param {string} outFileName - The destination filename in the bucket.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
export const uploadFile = async (file: any, outFileName: string) => {
    const sanitizedFileName = outFileName.replace(/^\//, ''); // Remove leading slash, if any
    const blob = bucket.file(sanitizedFileName);
    const blobStream = blob.createWriteStream();

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err: Error) => {
            reject(new Error(`Error uploading file: ${err.message}`));
        });

        blobStream.on('finish', async () => {
            try {
                const [metadata] = await blob.getMetadata();
                const etag = metadata.etag || ''; // Fetch ETag after upload
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(blob.name)}?v=${etag}`;
                resolve(publicUrl);
            } catch (error: any) {
                reject(new Error(`Failed to fetch metadata for ETag: ${error.message}`));
            }
        });

        blobStream.end(file.buffer);
    });
};

/**
 * Gets the public URL of a file with the ETag as a version parameter.
 * @param {string} fileName - The name of the file in the bucket.
 * @returns {Promise<string|null>} The public URL or null if the file doesn't exist.
 */
export const getFileUrl = async (fileName: string) => {
    const sanitizedFileName = fileName.replace(/^\//, ''); // Remove leading slash
    const file = bucket.file(sanitizedFileName);

    try {
        const [exists] = await file.exists();
        if (!exists) {
            return null; // File doesn't exist
        }

        const [metadata] = await file.getMetadata();
        const etag = metadata.etag || ''; // Fetch the ETag
        const encodedFileName = sanitizedFileName;
        return `https://storage.googleapis.com/${bucket.name}/${encodedFileName}?v=${etag}`;
    } catch (error: any) {
        throw new Error(`Failed to retrieve file URL: ${error.message}`);
    }
};