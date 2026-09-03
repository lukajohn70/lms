export const API_BASE_URL = `http://${window.location.hostname}/lms/api/index.php`;

function buildUrl(endpoint: string, token: string | null) {
  if (!token) return `${API_BASE_URL}${endpoint}`;
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${endpoint}${sep}token=${token}`;
}

export const apiClient = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    const url = buildUrl(endpoint, token);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Network error');
    return data;
  },
  post: async (endpoint: string, body: any) => {
    const token = localStorage.getItem('token');
    const url = buildUrl(endpoint, token);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Network error');
    return data;
  },
  // For multipart/form-data uploads (files, avatars, CSV imports)
  postForm: async (endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const url = buildUrl(endpoint, token);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type — browser sets it with boundary automatically
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Network error');
    return data;
  }
};
