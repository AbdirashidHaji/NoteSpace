import api from './client';

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => api.patch('/auth/profile', data).then((r) => r.data),
  changePassword: (data) => api.patch('/auth/password', data).then((r) => r.data),
};

export const notesApi = {
  list: (params) => api.get('/notes', { params }).then((r) => r.data),
  counts: () => api.get('/notes/counts').then((r) => r.data),
  get: (id) => api.get(`/notes/${id}`).then((r) => r.data),
  create: (data) => api.post('/notes', data).then((r) => r.data),
  update: (id, data) => api.patch(`/notes/${id}`, data).then((r) => r.data),
  trash: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
  deletePermanently: (id) => api.delete(`/notes/${id}?permanent=1`).then((r) => r.data),
};

export const categoriesApi = {
  list: (params) => api.get('/categories', { params }).then((r) => r.data),
  create: (data) => api.post('/categories', data).then((r) => r.data),
  update: (id, data) => api.patch(`/categories/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/categories/${id}`).then((r) => r.data),
};

export const tagsApi = {
  list: (params) => api.get('/tags', { params }).then((r) => r.data),
  create: (data) => api.post('/tags', data).then((r) => r.data),
  update: (id, data) => api.patch(`/tags/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/tags/${id}`).then((r) => r.data),
};
