import axios, { AxiosInstance } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

function createClient(prefix: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseURL}${prefix}`,
    timeout: 15000,
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('medicget.token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}

export const authHttp = createClient('/auth');
