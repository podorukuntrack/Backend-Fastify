import 'dotenv/config';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function resetR2() {
  console.log('Starting R2 reset...');
  try {
    let isTruncated = true;
    let continuationToken = undefined;
    let count = 0;

    while (isTruncated) {
      const listCmd = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(listCmd);
      
      if (!response.Contents || response.Contents.length === 0) {
        console.log('Bucket is already empty.');
        break;
      }

      const objectsToDelete = response.Contents.map(item => ({ Key: item.Key }));
      
      const deleteCmd = new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: {
          Objects: objectsToDelete,
        },
      });

      await s3Client.send(deleteCmd);
      count += objectsToDelete.length;

      console.log(`Deleted ${objectsToDelete.length} objects...`);

      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    }
    console.log(`✅ R2 Reset completed. Total ${count} files deleted.`);
  } catch (err) {
    console.error('Reset failed:', err);
  }
}

resetR2();
