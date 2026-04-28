const API_BASE = import.meta.env.VITE_PATIENT_API || 'http://localhost:8001';
const DOCTOR_API = import.meta.env.VITE_DOCTOR_API || 'http://localhost:8002';
const APPOINTMENT_API = import.meta.env.VITE_APPOINTMENT_API || 'http://localhost:8003';
const NOTIFICATION_API = import.meta.env.VITE_NOTIFICATION_API || 'http://localhost:8006';

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
    if (!res.ok) {
      return { detail: 'Invalid token' };
    }
    const data = await res.json();
    return data;
  },

  updateProfile: async (data) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getDoctors: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.doctor_name) params.append('doctor_name', filters.doctor_name);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.hospital) params.append('hospital', filters.hospital);
    if (filters.min_experience) params.append('min_experience', filters.min_experience);
    if (filters.max_fee) params.append('max_fee', filters.max_fee);
    const queryString = params.toString();
    const res = await fetch(`${API_BASE}/doctors${queryString ? '?' + queryString : ''}`);
    return res.json();
  },

  getSpecializations: async () => {
    const res = await fetch(`${API_BASE}/specializations`);
    return res.json();
  },

  getHospitals: async () => {
    const res = await fetch(`${API_BASE}/hospitals`);
    return res.json();
  },

  getDoctor: async (id) => {
    const res = await fetch(`${API_BASE}/doctors/${id}`);
    return res.json();
  },

  getDoctorAvailability: async (doctorId) => {
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/availability`);
    return res.json();
  },

  getAvailableSlots: async (doctorId, date) => {
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/slots?date=${date}`);
    return res.json();
  },

  lockSlot: async (slotId, patientId) => {
    const res = await fetch(`${DOCTOR_API}/doctors/slots/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ slot_id: slotId, patient_id: patientId }),
    });
    const data = await res.json();
    if (!res.ok && res.status === 401) {
      throw new Error('Please login to book an appointment');
    }
    return data;
  },

  bookSlot: async (slotId, patientId, doctorId, date, time, reason) => {
    const res = await fetch(`${DOCTOR_API}/doctors/slots/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        slot_id: slotId,
        patient_id: patientId,
        doctor_id: doctorId,
        date,
        time,
        reason
      }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Please login to book an appointment');
      }
      const err = await res.json();
      throw new Error(err.detail || 'Failed to book');
    }
    return res.json();
  },

  releaseSlot: async (slotId, patientId) => {
    const res = await fetch(`${DOCTOR_API}/doctors/slots/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ slot_id: slotId, patient_id: patientId }),
    });
    return res.json();
  },

  createAppointment: async (data) => {
    const res = await fetch(`${APPOINTMENT_API}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getAppointments: async () => {
    const res = await fetch(`${APPOINTMENT_API}/appointments`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getAppointment: async (id) => {
    const res = await fetch(`${APPOINTMENT_API}/appointments/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getRecords: async () => {
    const res = await fetch(`${API_BASE}/records`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  uploadRecord: async (file, recordType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('record_type', recordType);
    const res = await fetch(`${API_BASE}/records`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return res.json();
  },

  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  getUnreadNotifications: async () => {
    const userId = localStorage.getItem('patient_id') || 1;
    const res = await fetch(`${API_BASE}/notifications/unread/${userId}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },
};