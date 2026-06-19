import 'dotenv/config';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BACKUP_DIR = path.resolve('backup_r2');

function getContentType(ext) {
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getExistingKeys() {
  const keys = new Set();
  let isTruncated = true;
  let continuationToken = undefined;

  while (isTruncated) {
    const listCmd = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    });
    try {
      const response = await s3Client.send(listCmd);
      if (response.Contents) {
        for (const item of response.Contents) {
          keys.add(item.Key);
        }
      }
      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    } catch(err) {
      console.error("List failed, returning empty set", err);
      break;
    }
  }
  return keys;
}

async function restoreR2() {
  console.log('Starting R2 restore with retry logic...');
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('Backup directory does not exist.');
      return;
    }

    const existingKeys = await getExistingKeys();
    const files = fs.readdirSync(BACKUP_DIR);
    
    const filesToUpload = files.filter(f => !existingKeys.has(f));
    console.log(`Found ${files.length} total files. ${filesToUpload.length} remaining to upload.`);

    let count = 0;
    for (const file of filesToUpload) {
      const filePath = path.join(BACKUP_DIR, file);
      const ext = path.extname(file).toLowerCase();
      const fileContent = fs.readFileSync(filePath);

      const putCmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: file,
        Body: fileContent,
        ContentType: getContentType(ext),
      });

      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
          console.log(`Uploading ${file} (Retries left: ${retries - 1})...`);
          await s3Client.send(putCmd);
          success = true;
          count++;
        } catch (uploadErr) {
          console.error(`Error uploading ${file}:`, uploadErr.message);
          retries--;
          await sleep(1000);
        }
      }
      if (!success) {
        console.error(`Failed to upload ${file} after 3 retries. Stopping.`);
        break;
      }
    }
    console.log(`✅ Restore completed. Uploaded ${count} files this session.`);
  } catch (err) {
    console.error('Restore failed:', err);
  }
}

restoreR2();
