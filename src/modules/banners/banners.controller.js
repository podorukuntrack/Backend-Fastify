import * as service from './banners.service.js';

export const getAllHandler = async (request, reply) => {
  try {
    const data = await service.getBanners();
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message, errors: [] });
  }
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getBanner(request.params.id);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createBanner(request.body);
    return reply.code(201).send({ success: true, message: 'Banner created', data });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.updateBanner(request.params.id, request.body);
    return reply.code(200).send({ success: true, message: 'Banner updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.deleteBanner(request.params.id);
    return reply.code(200).send({ success: true, message: 'Banner deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};
