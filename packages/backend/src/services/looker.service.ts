export interface LookerCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

async function getAccessToken(creds: LookerCredentials): Promise<string> {
  const res = await fetch(`${creds.baseUrl}/api/4.0/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function testLookerConnection(creds: LookerCredentials): Promise<boolean> {
  try {
    await getAccessToken(creds);
    return true;
  } catch {
    return false;
  }
}

export async function listLookerLooks(creds: LookerCredentials): Promise<{ id: number; title: string }[]> {
  const token = await getAccessToken(creds);
  const res = await fetch(`${creds.baseUrl}/api/4.0/looks`, {
    headers: { Authorization: `token ${token}` },
  });
  const looks = await res.json() as { id: number; title: string }[];
  return looks.map(l => ({ id: l.id, title: l.title }));
}

export async function downloadLookAsExcel(
  creds: LookerCredentials,
  lookId: number,
  destPath: string
): Promise<void> {
  const token = await getAccessToken(creds);
  const res = await fetch(`${creds.baseUrl}/api/4.0/looks/${lookId}/run/xlsx`, {
    headers: { Authorization: `token ${token}` },
  });
  const buffer = await res.arrayBuffer();
  const fs = await import('fs');
  const path = await import('path');
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(buffer));
}
