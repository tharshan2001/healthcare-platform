/* eslint-disable import/no-unused-modules */

const API_BASE = 'http://localhost:8004/api/v1/telemedicine';

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
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
  listSessions: async (filters = {}) => requestJson(`/sessions${buildQueryString(filters)}`),
  getSession: async (sessionId) => requestJson(`/sessions/${sessionId}`),
  createSession: async (data) => requestJson('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  joinSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/join`, { method: 'POST', body: JSON.stringify(data) }),
  startSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/start`, { method: 'PATCH', body: JSON.stringify(data) }),
  completeSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelSession: async (sessionId, data) => requestJson(`/sessions/${sessionId}/cancel`, { method: 'PATCH', body: JSON.stringify(data) }),
};


