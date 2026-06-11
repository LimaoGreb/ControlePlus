// Google Drive API — upload e download de backup JSON.
// Usa o access token fornecido pelo GoogleAuthContext.

const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

async function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function findBackupFile(token, fileName) {
  const q = encodeURIComponent(`name='${fileName}' and trashed=false`);
  const res = await fetch(`${FILES_URL}?q=${q}&fields=files(id,name,modifiedTime)`, {
    headers: await authHeader(token),
  });
  const json = await res.json();
  return json?.files?.[0] || null;
}

export async function uploadToDrive(token, fileName, data) {
  const existing = await findBackupFile(token, fileName);
  const content = JSON.stringify(data, null, 2);
  const boundary = 'controle_plus_boundary_7x9k';

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: fileName, mimeType: 'application/json' }),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : UPLOAD_URL;

  const res = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      ...(await authHeader(token)),
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload falhou: ${res.status}`);
  return await res.json();
}

export async function downloadFromDrive(token, fileName) {
  const file = await findBackupFile(token, fileName);
  if (!file) return null;
  const res = await fetch(`${FILES_URL}/${file.id}?alt=media`, {
    headers: await authHeader(token),
  });
  if (!res.ok) throw new Error(`Drive download falhou: ${res.status}`);
  return { data: await res.json(), modifiedTime: file.modifiedTime };
}

export async function fetchGoogleUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: await authHeader(token),
  });
  return res.json();
}
