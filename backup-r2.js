import 'dotenv/config';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BACKUP_DIR = path.resolve('backup_r2');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupR2() {
  console.log('Starting R2 backup...');
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
        console.log('Bucket is empty.');
        break;
      }

      for (const item of response.Contents) {
        console.log(`Downloading ${item.Key}...`);
        const getCmd = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: item.Key,
        });

        const data = await s3Client.send(getCmd);
        const writeStream = fs.createWriteStream(path.join(BACKUP_DIR, item.Key));
        
        await new Promise((resolve, reject) => {
          if (data.Body instanceof Readable) {
            data.Body.pipe(writeStream)
              .on('error', reject)
              .on('close', resolve);
          } else {
            reject(new Error('Body is not a readable stream'));
          }
        });
        count++;
      }

      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    }
    console.log(`Backup completed. Downloaded ${count} files to ${BACKUP_DIR}`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

backupR2();
