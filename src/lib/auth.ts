import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { getSetting, setSetting } from '@/lib/storage';

// Replace with your GitHub App's Client ID
// Create one at: https://github.com/settings/apps/new (enable Device Flow)
export const GITHUB_CLIENT_ID = 'YOUR_GITHUB_APP_CLIENT_ID';

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

export async function loginWithGitHub(
  onVerification: (verification: Verification) => void,
): Promise<AuthData> {
  const auth = createOAuthDeviceAuth({
    clientType: 'github-app',
    clientId: GITHUB_CLIENT_ID,
    onVerification(verification) {
      onVerification(verification as Verification);
    },
  });

  // This polls until the user completes authorization
  const { token } = await auth({ type: 'oauth' });

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
