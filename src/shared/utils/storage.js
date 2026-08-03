// src/shared/utils/storage.js
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { validateUpload } from './fileTypes.js';

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
  // Titik simpul tunggal untuk SEMUA unggahan (dokumentasi, banner, logo),
  // sehingga validasinya cukup dipasang sekali di sini.
  const { ext, mime, isImage } = validateUpload(fileBuffer, originalFilename, mimeType);

  // Generate random string agar nama file unik
  const randomStr = crypto.randomBytes(8).toString('hex');

  let processedBuffer = fileBuffer;
  let finalMimeType = mime;   // selalu dari whitelist, tidak pernah dari klien
  let finalExt = ext;

  if (isImage) {
    try {
      processedBuffer = await sharp(fileBuffer)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1920, withoutEnlargement: true }) // Max width 1920px
        .webp({ quality: 80 }) // Compress and convert to webp
        .toBuffer();
      finalExt = '.webp';
      finalMimeType = 'image/webp';
    } catch (err) {
      // Isi berkas sudah dipastikan gambar sungguhan lewat magic bytes, jadi
      // menyimpan buffer aslinya aman. Tipe kontennya tetap dari whitelist.
      console.error('Image compression failed, proceeding with original buffer:', err.message);
    }
  }

  const fileKey = `${Date.now()}-${randomStr}${finalExt}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    Body: processedBuffer,
    ContentType: finalMimeType,
    // Berkas non-gambar dipaksa terunduh, bukan dirender browser. Ini lapisan
    // kedua setelah whitelist: seandainya ada tipe berbahaya yang lolos, ia
    // tidak akan dieksekusi sebagai halaman pada domain aset kita.
    ...(isImage ? {} : { ContentDisposition: 'attachment' }),
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

export const rotateFileInR2 = async (fileKey, degrees = 90) => {
  try {
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    
    const response = await s3Client.send(getCommand);
    const streamToBuffer = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });

    const fileBuffer = await streamToBuffer(response.Body);
    
    const angle = parseInt(degrees, 10);
    const processedBuffer = await sharp(fileBuffer)
      .rotate(angle)
      .toBuffer();
      
    const newFileKey = fileKey.replace(/(\.webp|\.jpg|\.png|\.jpeg)$/i, `-r${Date.now()}$1`);

    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: newFileKey,
      Body: processedBuffer,
      ContentType: response.ContentType,
    });

    await s3Client.send(putCommand);
    
    // Attempt to delete old file
    try {
      const delCommand = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      });
      await s3Client.send(delCommand);
    } catch (delErr) {
      console.error('Failed to delete old rotated file:', delErr);
    }
    
    return {
      newFileKey,
      newFileUrl: `${process.env.R2_PUBLIC_URL}/${newFileKey}`
    };
  } catch (err) {
    console.error('Error rotating file in R2:', err);
    throw err;
  }
};