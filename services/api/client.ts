import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT_MS, DEVICE_JOIN_CODE } from './config';

const TOKEN_KEY = "device_token";

export type ApiUser = {
  id: number;
  username: string;
  role: string;
};

export type DeviceRegistration = {
  token: string;
  device_id: number;
  user: ApiUser;
};

class DeviceNotRegisteredException extends Error {}

async function registerDevice (): Promise<DeviceRegistration> {
  const data = await apiRequest<DeviceRegistration>("/api/auth/devices/register/", {
    method: "POST",
    body: JSON.stringify({
      join_code: DEVICE_JOIN_CODE,
      platform: "android",
      app_version: "1.0.0",
    }),
    anonymous: true,
  });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return data;
}

export async function getToken (): Promise<string> {
  let token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) token = (await registerDevice()).token;
  return token;
}

async function ensureTokenValid (): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(token => {
        if (token) return resolve(token);
        registerDevice().then(data => resolve(data.token)).catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
}

type RequestOptions = RequestInit & { anonymous?: boolean };

// Pide un recurso de la API. Registra el dispositivo si no hay token y
// re-registra + reintenta una vez si el token fue revocado (401).
export async function apiRequest<T> (path: string, options: RequestOptions = {}): Promise<T> {
  const { anonymous, ...fetchOptions } = options;

  const doFetch = async (token: string | null): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...fetchOptions.headers,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let token: string | null = null;
  if (!anonymous) {
    try {
      token = await ensureTokenValid();
    } catch (err) {
      console.log("No se pudo registrar el dispositivo en RiceBack", err);
      throw new DeviceNotRegisteredException();
    }
  }

  let response: Response;
  try {
    response = await doFetch(token);
  } catch (err) {
    console.log(`Error de red llamando ${path}`, err);
    throw new NetworkRequestException(path);
  }

  if (response.status === 401 && !anonymous) {
    // Token ausente/revocado: registrar de nuevo y reintentar una vez
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    let newToken: string;
    try {
      newToken = (await registerDevice()).token;
    } catch (err) {
      console.log("No se pudo re-registrar el dispositivo en RiceBack", err);
      throw new DeviceNotRegisteredException();
    }
    try {
      response = await doFetch(newToken);
    } catch (err) {
      console.log(`Error de red reintentando ${path}`, err);
      throw new NetworkRequestException(path);
    }
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new ApiRequestException(path, response.status, message);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiRequestException(path, response.status, text);
  }
}

export class NetworkRequestException extends Error {
  readonly path: string;
  constructor (path: string) {
    super(`Error de red en ${path}`);
    this.path = path;
  }
}

export class ApiRequestException extends Error {
  readonly path: string;
  readonly status: number;
  constructor (path: string, status: number, detail: string) {
    super(`HTTP ${status} en ${path}: ${detail}`.trim());
    this.path = path;
    this.status = status;
  }
}

export { DeviceNotRegisteredException };
