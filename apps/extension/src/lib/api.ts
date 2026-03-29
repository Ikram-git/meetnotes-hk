const API_URL = 'http://localhost:3000';

export async function uploadAudio(blob: Blob, filename: string, token: string | null) {
  const formData = new FormData();
  formData.append('audio', blob, filename);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}
