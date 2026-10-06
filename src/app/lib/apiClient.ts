export const API_BASE_URL = `http://${window.location.hostname}/lms/api/index.php`;

/** Build auth headers — token travels ONLY in the Authorization header, never in the URL. */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Network error');
    return data;
  },

  post: async (endpoint: string, body: unknown) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Network error');
    return data;
  },

  // For multipart/form-data uploads (files, avatars, CSV imports)
  postForm: async (endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type — browser sets it with boundary automatically
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Network error');
    return data;
  },
};

