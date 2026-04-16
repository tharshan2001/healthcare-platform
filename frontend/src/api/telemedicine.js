const getDefaultApiBase = () => {
  if (typeof globalThis === 'undefined' || !globalThis.location) {
    return 'http://localhost:8004/api/v1/telemedicine';
  }
  const { protocol, hostname } = globalThis.location;
  return `${protocol}//${hostname}:8004/api/v1/telemedicine`;
};

const API_BASE = import.meta.env.VITE_TELEMEDICINE_API_BASE || getDefaultApiBase();

const requestJson = async (path, options = {}) => {
  const headers = { ...(options.headers ?? {}) };
  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.detail || payload?.message || payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const telemedicineAPI = {
  listSessions: async ({ role, participant_id, ...filters } = {}) => requestJson(`/sessions${buildQueryString({ role, participant_id, ...filters })}`),
  getSession: async (sessionId, { role, participant_id } = {}) => requestJson(`/sessions/${sessionId}${buildQueryString({ role, participant_id })}`),
  createSession: async (data) => requestJson('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  joinSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/join`, { method: 'POST', body: JSON.stringify(data) }),
  startSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/start`, { method: 'PATCH', body: JSON.stringify(data) }),
  completeSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/cancel`, { method: 'PATCH', body: JSON.stringify(data) }),
};


