export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
}

export interface RemoteFile {
  path: string;
  sha: string;
  content: string;
}

export interface RemoteEntry {
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

class GitHubAuthError extends Error {
  constructor() {
    super('GitHub authentication expired. Please sign in again.');
    this.name = 'GitHubAuthError';
  }
}

async function githubFetch(
  token: string,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  if (res.status === 401) throw new GitHubAuthError();
  return res;
}

// UTF-8 safe base64
function encodeBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function decodeBase64(encoded: string): string {
  const binary = atob(encoded.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function listRepos(token: string): Promise<RepoInfo[]> {
  const repos: RepoInfo[] = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await githubFetch(
      token,
      `https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner&page=${page}`,
    );
    if (!res.ok) throw new Error(`Failed to list repos: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const r of data) {
      repos.push({
        owner: r.owner.login as string,
        name: r.name as string,
        fullName: r.full_name as string,
        isPrivate: r.private as boolean,
      });
    }
    if (data.length < 100) break;
    page++;
  }
  return repos;
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean,
): Promise<RepoInfo> {
  const res = await githubFetch(token, 'https://api.github.com/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
      description: 'Markdown notes synced with mdnotes.co',
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create repo: ${(err.message as string) || res.status}`);
  }
  const r = await res.json();
  return {
    owner: r.owner.login as string,
    name: r.name as string,
    fullName: r.full_name as string,
    isPrivate: r.private as boolean,
  };
}

export async function getRepoTree(
  token: string,
  owner: string,
  repo: string,
): Promise<RemoteEntry[]> {
  const res = await githubFetch(
    token,
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
  );
  // Empty repo or no commits
  if (res.status === 404 || res.status === 409) return [];
  if (!res.ok) throw new Error(`Failed to get repo tree: ${res.status}`);
  const data = await res.json();
  const tree = data.tree as Array<{ path: string; sha: string; type: string }>;
  return tree
    .filter(
      (entry) =>
        entry.type === 'blob' &&
        (entry.path.endsWith('.md') || entry.path.endsWith('.annotations.json')),
    )
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      type: 'file' as const,
    }));
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<RemoteFile> {
  const res = await githubFetch(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
  );
  if (!res.ok) throw new Error(`Failed to get file ${path}: ${res.status}`);
  const data = await res.json();
  return {
    path: data.path as string,
    sha: data.sha as string,
    content: decodeBase64(data.content as string),
  };
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha?: string,
  message?: string,
): Promise<string> {
  const body: Record<string, string> = {
    message: message ?? (sha ? `Update ${path}` : `Create ${path}`),
    content: encodeBase64(content),
  };
  if (sha) body.sha = sha;

  const res = await githubFetch(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to save ${path}: ${(err.message as string) || res.status}`);
  }
  const data = await res.json();
  return data.content.sha as string;
}

export async function deleteRemoteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message?: string,
): Promise<void> {
  const res = await githubFetch(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message ?? `Delete ${path}`,
        sha,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to delete ${path}: ${(err.message as string) || res.status}`);
  }
}
