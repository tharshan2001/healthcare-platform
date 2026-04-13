const API_BASE = 'http://localhost:8002';

const getAuthHeader = () => {
  const token = localStorage.getItem('doctor_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const doctorAPI = {
  register: async (data) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  login: async (data) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.access_token) {
      localStorage.setItem('doctor_token', json.access_token);
    }
    return json;
  },

  logout: () => {
    localStorage.removeItem('doctor_token');
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  updateProfile: async (data) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getDoctors: async (specialty) => {
    const params = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
    const res = await fetch(`${API_BASE}/doctors${params}`);
    return res.json();
  },

  getDoctor: async (id) => {
    const res = await fetch(`${API_BASE}/doctors/${id}`);
    return res.json();
  },

  addAvailability: async (data) => {
    const res = await fetch(`${API_BASE}/availability/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getMyAvailability: async () => {
    const res = await fetch(`${API_BASE}/availability/availability`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  deleteAvailability: async (id) => {
    const res = await fetch(`${API_BASE}/availability/availability/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  createPrescription: async (data) => {
    const res = await fetch(`${API_BASE}/prescriptions/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getMyPrescriptions: async () => {
    const res = await fetch(`${API_BASE}/prescriptions/prescriptions`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getMyAppointments: async () => {
    const res = await fetch('http://localhost:8003/appointments/appointments?doctor_id=1');
    return res.json();
  },

  updateAppointment: async (id, data) => {
    const res = await fetch(`http://localhost:8003/appointments/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};