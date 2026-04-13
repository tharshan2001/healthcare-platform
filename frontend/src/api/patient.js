const API_BASE = 'http://localhost:8001';

const getAuthHeader = () => {
  const token = localStorage.getItem('patient_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const patientAPI = {
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
      localStorage.setItem('patient_token', json.access_token);
    }
    return json;
  },

  logout: () => {
    localStorage.removeItem('patient_token');
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
    const res = await fetch(`${API_BASE}/doctors/doctors/public${params}`);
    return res.json();
  },

  getDoctor: async (id) => {
    const res = await fetch(`${API_BASE}/doctors/doctors/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getDoctorAvailability: async (doctorId) => {
    const res = await fetch(`${API_BASE}/doctors/doctors/${doctorId}/availability`);
    return res.json();
  },

  getAvailableSlots: async (doctorId, date) => {
    const res = await fetch(`${API_BASE}/doctors/doctors/${doctorId}/slots?date=${date}`);
    return res.json();
  },

  createAppointment: async (data) => {
    const res = await fetch(`${API_BASE}/appointments/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getAppointments: async () => {
    const res = await fetch(`${API_BASE}/appointments/appointments`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getAppointment: async (id) => {
    const res = await fetch(`${API_BASE}/appointments/appointments/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getRecords: async () => {
    const res = await fetch(`${API_BASE}/records/records`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  uploadRecord: async (file, recordType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('record_type', recordType);
    const res = await fetch(`${API_BASE}/records/upload-record`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return res.json();
  },

  getNotifications: async () => {
    const userId = localStorage.getItem('patient_id') || 1;
    const res = await fetch(`http://localhost:8004/notifications/${userId}`);
    return res.json();
  },

  getUnreadNotifications: async () => {
    const userId = localStorage.getItem('patient_id') || 1;
    const res = await fetch(`http://localhost:8004/notifications/unread/${userId}`);
    return res.json();
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`http://localhost:8004/notifications/${id}`, {
      method: 'PUT',
    });
    return res.json();
  },
};