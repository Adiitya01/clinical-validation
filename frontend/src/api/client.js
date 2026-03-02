import axios from 'axios';

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';
if (API_BASE_URL && !API_BASE_URL.startsWith('http')) {
  API_BASE_URL = `https://${API_BASE_URL}/api`;
}

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

  getStatus: async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/pipeline/${sessionId}/status`);
    return response.data;
  },

  getResults: async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/pipeline/${sessionId}/results`);
    return response.data;
  },

  getDownloadUrl: (sessionId) => {
    return `${API_BASE_URL}/report/${sessionId}/download`;
  }
};

export default client;
