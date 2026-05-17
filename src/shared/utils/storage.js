// src/shared/utils/storage.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: 'auto', // R2 selalu menggunakan region 'auto'
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const uploadFileToR2 = async (fileBuffer, originalFilename, mimeType) => {
  // Generate random string agar nama file unik
  const randomStr = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalFilename);
  const fileKey = `${Date.now()}-${randomStr}${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return public URL dan key-nya
  return {
    fileUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}`,
    fileKey: fileKey,
  };
};

export const deleteFileFromR2 = async (fileKey) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
  return true;
};