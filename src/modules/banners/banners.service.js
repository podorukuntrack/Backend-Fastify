import * as repository from './banners.repository.js';

export const getBanners = async () => {
  return await repository.findAll();
};

export const getBanner = async (id) => {
  const banner = await repository.findById(id);
  if (!banner) throw new Error('Banner not found');
  return banner;
};

export const createBanner = async (data) => {
  return await repository.insert(data);
};

export const updateBanner = async (id, data) => {
  const banner = await repository.findById(id);
  if (!banner) throw new Error('Banner not found');
  return await repository.update(id, data);
};

export const deleteBanner = async (id) => {
  const banner = await repository.findById(id);
  if (!banner) throw new Error('Banner not found');
  return await repository.remove(id);
};
