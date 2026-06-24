import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' });

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getConversations  = ()  => API.get('/api/conversations').then(r => r.data);
export const getMessages       = (id, page = 1) =>
  API.get(`/api/messages/${id}?page=${page}&limit=30`).then(r => r.data);
export const sendMessage       = (data) => API.post('/api/messages', data).then(r => r.data);
export const createOrGetConversation = (participantId) =>
  API.post('/api/conversations', { participantId }).then(r => r.data);
export const storeEncryptedKey = (convId, encryptedKey) =>
  API.patch(`/api/conversations/${convId}/keys`, { encryptedKey }).then(r => r.data);
export const updatePublicKey   = (publicKey) =>
  API.patch('/api/users/publicKey', { publicKey }).then(r => r.data);