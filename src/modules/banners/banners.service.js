import * as repository from './banners.repository.js';
import { uploadFileToR2, deleteFileFromR2 } from '../../shared/utils/storage.js';

export const getBanners = async () => {
  return await repository.findAll();
};

export const getBanner = async (id) => {
  const banner = await repository.findById(id);
  if (!banner) throw new Error('Banner not found');
  return banner;
};

export const createBanner = async (fields, fileData) => {
  // Upload ke R2
  const r2Data = await uploadFileToR2(fileData.buffer, fileData.filename, fileData.mimetype);
  
  const targetCompanies = fields.targetCompanies ? JSON.parse(fields.targetCompanies) : [];
  
  const data = {
    name: fields.name,
    linkUrl: fields.linkUrl || null,
    isActive: fields.isActive || 'true',
    imageUrl: r2Data.fileUrl,
    r2Key: r2Data.fileKey,
    targetCompanies: targetCompanies,
  };

  return await repository.insert(data);
};

export const updateBanner = async (id, fields, fileData) => {
  const banner = await repository.findById(id);
  if (!banner) throw new Error('Banner not found');
  
  let imageUrl = banner.imageUrl;
  let r2Key = banner.r2Key;

  if (fileData) {
    // Hapus file lama jika ada
    if (banner.r2Key) {
      await deleteFileFromR2(banner.r2Key);
    }
    // Upload file baru
    const r2Data = await uploadFileToR2(fileData.buffer, fileData.filename, fileData.mimetype);
    imageUrl = r2Data.fileUrl;
    r2Key = r2Data.fileKey;
  }
  
  const targetCompanies = fields.targetCompanies ? JSON.parse(fields.targetCompanies) : banner.targetCompanies;

  const data = {
    name: fields.name || banner.name,
    linkUrl: fields.linkUrl !== undefined ? fields.linkUrl : banner.linkUrl,
    isActive: fields.isActive || banner.isActive,
    imageUrl,
    r2Key,
    targetCompanies,
  };

  return await repository.update(id, data);
};

export const deleteBanner = async (id) => {
  const banner = await repository.findById(id);
  if (!banner) throw new Error('Banner not found');
  
  if (banner.r2Key) {
    await deleteFileFromR2(banner.r2Key);
  }
  
  return await repository.remove(id);
};
