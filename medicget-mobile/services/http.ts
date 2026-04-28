import axios, { AxiosInstance } from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

let cachedToken: string | null = null;

export function setAuthToken(token: string | null): void {
  cachedToken = token;
}

function createClient(prefix: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseURL}${prefix}`,
    timeout: 15000,
  });

  client.interceptors.request.use((config) => {
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
  });

  return client;
}

export const authHttp = createClient('/auth');
