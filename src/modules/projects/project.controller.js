import * as service from './project.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getProjects(request.user);
  return reply.code(200).send({ success: true, message: 'Projects retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getProject(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Project retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  console.log("USER DATA:", request.user); // CEK INI DI TERMINAL
  const data = await service.createProject(request.body, request.user);
  return reply.code(201).send({ success: true, message: 'Project created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyProject(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Project updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeProject(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Project deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getStatsHandler = async (request, reply) => {
  try {
    const data = await service.getProjectStatistics(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Project stats retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};