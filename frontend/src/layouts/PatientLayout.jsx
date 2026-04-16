import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { patientAPI } from '../api/patient';

const menuItems = [
  { path: '/patient/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/patient/doctors', icon: '👨‍⚕️', label: 'Find Doctors' },
  { path: '/patient/appointments', icon: '📅', label: 'Appointments' },
  { path: '/patient/records', icon: '📋', label: 'Medical Records' },
  { path: '/patient/telemedicine', icon: '📹', label: 'Telemedicine' },
  { path: '/patient/symptoms', icon: '🤒', label: 'Symptom Checker' },
  { path: '/patient/profile', icon: '👤', label: 'Profile' },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_id');
    navigate('/patient/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-blue-600">HealthCare</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full rounded-lg text-red-600 hover:bg-red-50"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}