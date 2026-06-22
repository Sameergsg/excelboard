import axios from 'axios';

export const api = axios.create({ baseURL: 'http://localhost:3001/api' });

export const sourcesApi = {
  list: () => api.get('/sources').then(r => r.data),
  get: (id: string) => api.get(`/sources/${id}`).then(r => r.data),
  getData: (id: string, params?: object) => api.get(`/sources/${id}/data`, { params }).then(r => r.data),
  getStats: (id: string, sheet?: string) => api.get(`/sources/${id}/stats`, { params: { sheet } }).then(r => r.data),
  upload: (file: File, name?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (name) fd.append('name', name);
    return api.post('/sources/upload', fd).then(r => r.data);
  },
  refresh: (id: string) => api.post(`/sources/${id}/refresh`).then(r => r.data),
  delete: (id: string) => api.delete(`/sources/${id}`).then(r => r.data),
  patch: (id: string, data: object) => api.patch(`/sources/${id}`, data).then(r => r.data),
  importUrl: (url: string, name?: string, headers?: object) =>
    api.post('/sources/url/import', { url, name, headers }).then(r => r.data),
  importOneDrive: (data: object) => api.post('/sources/onedrive/import', data).then(r => r.data),
  getOneDriveAuthUrl: () => api.get('/sources/onedrive/auth').then(r => r.data),
  testAzure: (connectionString: string) => api.post('/sources/azure/test', { connectionString }).then(r => r.data),
  listAzureBlobs: (connectionString: string, container: string) =>
    api.post('/sources/azure/blobs', { connectionString, container }).then(r => r.data),
  importAzure: (data: object) => api.post('/sources/azure/import', data).then(r => r.data),
  testLooker: (data: object) => api.post('/sources/looker/test', data).then(r => r.data),
  listLookerLooks: (data: object) => api.post('/sources/looker/looks', data).then(r => r.data),
  importLooker: (data: object) => api.post('/sources/looker/import', data).then(r => r.data),
};

export const dashboardsApi = {
  list: () => api.get('/dashboards').then(r => r.data),
  get: (id: string) => api.get(`/dashboards/${id}`).then(r => r.data),
  create: (data: object) => api.post('/dashboards', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/dashboards/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/dashboards/${id}`).then(r => r.data),
  duplicate: (id: string) => api.post(`/dashboards/${id}/duplicate`).then(r => r.data),
  addWidget: (dashId: string, data: object) => api.post(`/dashboards/${dashId}/widgets`, data).then(r => r.data),
  updateWidget: (widgetId: string, data: object) => api.put(`/dashboards/widgets/${widgetId}`, data).then(r => r.data),
  deleteWidget: (widgetId: string) => api.delete(`/dashboards/widgets/${widgetId}`).then(r => r.data),
  updatePositions: (dashId: string, positions: object[]) =>
    api.put(`/dashboards/${dashId}/widgets/positions`, { positions }).then(r => r.data),
};

export const preferencesApi = {
  get: () => api.get('/preferences').then(r => r.data),
  set: (data: object) => api.put('/preferences', data).then(r => r.data),
};
