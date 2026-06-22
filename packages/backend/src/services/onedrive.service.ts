import fs from 'fs';
import path from 'path';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
    scope: 'Files.Read Files.Read.All offline_access',
    state,
  });
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
        grant_type: 'authorization_code',
      }),
    }
  );
  const data = await res.json() as { access_token: string; refresh_token: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }
  );
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function downloadOneDriveFile(
  accessToken: string,
  driveItemId: string,
  destPath: string
): Promise<void> {
  const metaRes = await fetch(`${GRAPH_BASE}/me/drive/items/${driveItemId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meta = await metaRes.json() as { '@microsoft.graph.downloadUrl': string };
  const downloadUrl = meta['@microsoft.graph.downloadUrl'];

  const fileRes = await fetch(downloadUrl);
  const buffer = await fileRes.arrayBuffer();
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(buffer));
}
