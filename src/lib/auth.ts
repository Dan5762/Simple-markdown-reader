import { getSetting, setSetting } from '@/lib/storage';

export const GITHUB_CLIENT_ID = 'Ov23limIrFoxqtbznShg';

// Cloudflare Worker proxy to bypass CORS on GitHub's OAuth endpoints
const AUTH_PROXY_URL = import.meta.env.DEV
  ? 'http://localhost:8787'
  : 'https://mdnotes-auth-proxy.dananjlong.workers.dev';

const AUTH_STORAGE_KEY = 'github-auth';

export interface AuthData {
  token: string;
  username: string;
}

export interface Verification {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

async function requestDeviceCode(): Promise<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}> {
  const res = await fetch(`${AUTH_PROXY_URL}/login/device/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'repo' }),
  });
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`);
  return res.json();
}

async function pollForToken(deviceCode: string, interval: number): Promise<string> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((r) => setTimeout(r, interval * 1000));

    const res = await fetch(`${AUTH_PROXY_URL}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!res.ok) throw new Error(`Token request failed: ${res.status}`);

    const data = await res.json();

    if (data.access_token) return data.access_token as string;

    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      interval = (data.interval as number) || interval + 5;
      continue;
    }
    if (data.error === 'expired_token') throw new Error('Device code expired. Please try again.');
    if (data.error === 'access_denied') throw new Error('Authorization was denied.');

    throw new Error(`Unexpected error: ${data.error}`);
  }
}

export async function loginWithGitHub(
  onVerification: (verification: Verification) => void,
): Promise<AuthData> {
  const deviceData = await requestDeviceCode();
  onVerification(deviceData);

  const token = await pollForToken(deviceData.device_code, deviceData.interval);

  // Fetch the authenticated user's login
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = await res.json();
  const username = user.login as string;

  const authData: AuthData = { token, username };
  await saveAuth(authData);
  return authData;
}

export async function getStoredAuth(): Promise<AuthData | null> {
  const data = await getSetting<AuthData>(AUTH_STORAGE_KEY);
  return data ?? null;
}

export async function saveAuth(auth: AuthData): Promise<void> {
  await setSetting(AUTH_STORAGE_KEY, auth);
}

export async function clearAuth(): Promise<void> {
  await setSetting(AUTH_STORAGE_KEY, null);
}
