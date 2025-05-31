export const API_BASE = 'https://3a30-77-241-136-45.ngrok-free.app';

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'worker_app_access_token';
const REFRESH_TOKEN_KEY = 'worker_app_refresh_token';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export function getPublicImageUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) {
    return `https://3a30-77-241-136-45.ngrok-free.app/public${path}`;
  }
  return path;
}

export async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token found');
  const response = await fetch(`${API_BASE}/v1/auth/refresh-token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await response.json();
  console.log('[API] Refresh token response:', data);
  if (data.access_token && data.refresh_token) {
    await saveTokens(data.access_token, data.refresh_token);
  }
  return data;
}