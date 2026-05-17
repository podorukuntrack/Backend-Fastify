import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function testR2() {
  try {
    console.log("Testing R2 connection...");
    console.log("Bucket:", process.env.R2_BUCKET_NAME);
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'test-upload.txt',
      Body: Buffer.from('Hello R2!'),
      ContentType: 'text/plain',
    });
    
    await s3Client.send(command);
    console.log("Success! Uploaded test-upload.txt");
  } catch (err) {
    console.error("R2 Error:", err.message);
    if (err.$metadata) console.error("HTTP Status:", err.$metadata.httpStatusCode);
  }
}

testR2();
