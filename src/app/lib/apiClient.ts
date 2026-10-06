function computeApiBaseUrl(): string {
  // If running via Vite / dev server port (e.g. 5173, 3000), connect to Apache on port 80
  const isDevPort = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');
  if (isDevPort) {
    return `http://${window.location.hostname}/lms/api/index.php`;
  }
  return typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/lms/api/index.php`
    : '/lms/api/index.php';
}

export const API_BASE_URL = computeApiBaseUrl();

/** Build auth headers — token travels ONLY in the Authorization header, never in the URL. */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Safely parse response text into JSON with friendly fallback error reporting */
async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  let data: any = null;

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML error page or raw text)
      const cleanSnippet = text.replace(/<[^>]*>?/gm, '').trim().slice(0, 120);
      throw new Error(
        cleanSnippet || `Server returned invalid response (HTTP ${response.status})`
      );
    }
  } else {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Server error (HTTP ${response.status})`);
  }

  return data;
}

export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    return parseResponse(response);
  },

  post: async (endpoint: string, body: unknown) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    return parseResponse(response);
  },

  // For multipart/form-data uploads (files, avatars, CSV imports)
  postForm: async (endpoint: string, formData: FormData) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type — browser sets it with boundary automatically
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return parseResponse(response);
  },
};
