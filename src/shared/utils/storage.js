// src/shared/utils/storage.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';

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
  const ext = path.extname(originalFilename).toLowerCase();
  
  // Compress if image
  let processedBuffer = fileBuffer;
  let finalMimeType = mimeType;
  let finalExt = ext;
  
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext) || mimeType.startsWith('image/')) {
    try {
      processedBuffer = await sharp(fileBuffer)
        .resize({ width: 1920, withoutEnlargement: true }) // Max width 1920px
        .webp({ quality: 80 }) // Compress and convert to webp
        .toBuffer();
      finalExt = '.webp';
      finalMimeType = 'image/webp';
    } catch (err) {
      console.error('Image compression failed, proceeding with original buffer:', err);
    }
  }

  const fileKey = `${Date.now()}-${randomStr}${finalExt}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    Body: processedBuffer,
    ContentType: finalMimeType,
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