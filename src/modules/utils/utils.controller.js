// src/modules/utils/utils.controller.js
import { rotateFileInR2 } from '../../shared/utils/storage.js';
import { AppError } from '../../shared/utils/AppError.js';

export const rotateImage = async (request, reply) => {
  const { fileUrl, direction } = request.body;

  if (!fileUrl) {
    throw new AppError(400, 'fileUrl is required');
  }

  // Extract fileKey from fileUrl
  // Example url: https://pub-xxxxxxxx.r2.dev/1721568283457-12345678.webp
  // Also handle cases with query params ?v=123
  const urlObj = new URL(fileUrl);
  const pathname = urlObj.pathname;
  const urlParts = pathname.split('/');
  const fileKey = urlParts[urlParts.length - 1];

  if (!fileKey) {
    throw new AppError(400, 'Invalid fileUrl, cannot extract fileKey');
  }

  try {
    await rotateFileInR2(fileKey, direction);
    return {
      message: 'Image rotated successfully',
      success: true
    };
  } catch (error) {
    console.error('Rotate image error:', error);
    throw new AppError(500, 'Failed to rotate image');
  }
};
