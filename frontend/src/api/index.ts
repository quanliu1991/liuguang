import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Servers
export const getServers = () => API.get('/servers');
export const getServer = (id: number) => API.get(`/servers/${id}`);
export const createServer = (data: any) => API.post('/servers', data);
export const updateServer = (id: number, data: any) => API.put(`/servers/${id}`, data);
export const deleteServer = (id: number) => API.delete(`/servers/${id}`);
export const getServerGpuStatus = (id: number) => API.get(`/servers/${id}/gpu-status`);
export const serverHealthCheck = (id: number) => API.post(`/servers/${id}/health-check`);
export const serverDetectGpu = (id: number) => API.post(`/servers/${id}/detect-gpu`);
export const serverAutoSetup = (id: number, data: { ssh_password: string; ssh_port: number }) => API.post(`/servers/${id}/auto-setup`, data);

// Models
export const getModels = () => API.get('/models');
export const createModel = (data: any) => API.post('/models', data);
export const updateModel = (id: number, data: any) => API.put(`/models/${id}`, data);
export const deleteModel = (id: number) => API.delete(`/models/${id}`);

// Deployments
export const getDeployments = () => API.get('/deployments');
export const scanDeployments = () => API.post('/deployments/scan');
export const scanSingleServer = (serverId: number) => API.post(`/deployments/scan/${serverId}`);
export const createDeployment = (data: any) => API.post('/deployments', data);
export const deleteDeployment = (id: number) => API.delete(`/deployments/${id}`);
export const getDeployYaml = (id: number) => API.get(`/deployments/${id}/yaml`);
export const getDeployProgress = (id: number) => API.get(`/deployments/${id}/progress`);

// Image Versions
export const getImageVersions = () => API.get('/images');
export const createImageVersion = (data: any) => API.post('/images', data);
export const updateImageVersion = (id: number, data: any) => API.put(`/images/${id}`, data);
export const deleteImageVersion = (id: number) => API.delete(`/images/${id}`);

// Deploy logs SSE
export const getDeployLogsUrl = (id: number) => `/api/deployments/${id}/logs`;

export default API;
