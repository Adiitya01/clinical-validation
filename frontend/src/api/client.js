import axios from 'axios';

let VITE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

// 1. Ensure it starts with https:// if not localhost and doesn't already have a protocol
if (!VITE_URL.startsWith('http')) {
  VITE_URL = `https://${VITE_URL}`;
}

// 2. Trim trailing slashes for clean construction
let API_BASE_URL = VITE_URL.replace(/\/$/, "");

// 3. Ensure it ends with /api (if the backend is structured that way)
if (!API_BASE_URL.endsWith('/api') && !API_BASE_URL.includes('/api/')) {
  API_BASE_URL = `${API_BASE_URL}/api`;
}

// Derive WebSocket base URL from HTTP base (http→ws, https→wss)
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

const client = {
  uploadFiles: async (document, guideline) => {
    const formData = new FormData();
    formData.append('document', document);
    formData.append('guideline', guideline);
    const response = await axios.post(`${API_BASE_URL}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  startPipeline: async (sessionId) => {
    const response = await axios.post(`${API_BASE_URL}/pipeline/${sessionId}/start`);
    return response.data;
  },

  getResults: async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/pipeline/${sessionId}/results`);
    return response.data;
  },

  getDownloadUrl: (sessionId) => {
    return `${API_BASE_URL}/report/${sessionId}/download`;
  },

  openStatusSocket: (sessionId) => {
    return new WebSocket(`${WS_BASE_URL}/pipeline/${sessionId}/ws`);
  },
};

export default client;
