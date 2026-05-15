// src/modules/projects/project.service.js
import * as projectRepo from './project.repository.js';

export const getProjects = async (userContext) => {
  const result = await projectRepo.findAllProjects(userContext);
    
  return result.map((project) => ({
    id: project.id,
    nama_proyek: project.namaProyek,
    deskripsi: project.deskripsi,
    lokasi: project.lokasi,
    status: project.status,
    created_at: project.createdAt.toISOString(),
  }));
};

export const getProject = async (id, userContext) => {
  const project = await projectRepo.findProjectById(id, userContext);
  if (!project) throw new Error("Project not found");

  return {
    id: project.id,
    nama_proyek: project.namaProyek,
    deskripsi: project.deskripsi,
    lokasi: project.lokasi,
    status: project.status,
    created_at: project.createdAt.toISOString(),
  };
};

export const createProject = async (data, userContext) => {
  const companyId = data.company_id ?? data.companyId ?? userContext.companyId;

  if (!companyId) {
    const error = new Error("Pilih perusahaan terlebih dahulu untuk membuat proyek");
    error.statusCode = 400;
    throw error;
  }

  return await projectRepo.insertProject({
    namaProyek: data.nama_proyek,
    deskripsi: data.deskripsi,
    lokasi: data.lokasi,
    status: data.status || "active",
    companyId,
    createdBy: userContext.sub,
  });
};

export const modifyProject = async (id, data, userContext) => {
  const updateData = {
    namaProyek: data.nama_proyek,
    deskripsi: data.deskripsi,
    lokasi: data.lokasi,
    status: data.status,
  };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );

  const updatedProject = await projectRepo.updateProject(id, updateData, userContext);

  if (!updatedProject) return null;

  return {
    id: updatedProject.id,
    nama_proyek: updatedProject.namaProyek,
    deskripsi: updatedProject.deskripsi,
    lokasi: updatedProject.lokasi,
    status: updatedProject.status,
    created_at: updatedProject.createdAt,
  };
};

export const removeProject = async (id, userContext) => {
  return await projectRepo.deleteProject(id, userContext);
};

export const getProjectStatistics = async (id, userContext) => {
  return await projectRepo.getProjectStats(id, userContext);
};
