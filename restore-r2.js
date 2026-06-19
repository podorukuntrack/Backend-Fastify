import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

async function restoreR2() {
  console.log('Starting R2 restore...');
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('Backup directory does not exist.');
      return;
    }

    const files = fs.readdirSync(BACKUP_DIR);
    console.log(`Found ${files.length} files to restore.`);

    let count = 0;
    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const ext = path.extname(file).toLowerCase();
      
      const fileContent = fs.readFileSync(filePath);

      const putCmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: file,
        Body: fileContent,
        ContentType: getContentType(ext),
      });

      console.log(`Uploading ${file}...`);
      await s3Client.send(putCmd);
      count++;
    }
    console.log(`✅ Restore completed. Uploaded ${count} files.`);
  } catch (err) {
    console.error('Restore failed:', err);
  }
}

restoreR2();
