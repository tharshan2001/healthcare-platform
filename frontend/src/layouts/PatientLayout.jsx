import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { patientAPI } from '../api/patient';
import { Icons } from '../components/Icons';

const menuItems = [
  { path: '/patient/dashboard', icon: 'home', label: 'Dashboard' },
  { path: '/patient/appointments', icon: 'calendar', label: 'Appointments' },
  { path: '/patient/records', icon: 'clipboard', label: 'Records' },
  { path: '/patient/profile', icon: 'user', label: 'Profile' },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await patientAPI.getProfile();
        if (data?.id) {
          setProfile(data);
          localStorage.setItem('patient_id', data.id);
          
          const appointments = await patientAPI.getAppointments();
          const upcoming = (appointments || [])
            .filter(apt => apt.patient_id === data.id && apt.status === 'scheduled')
            .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
          
          if (upcoming.length > 0) {
            setNextAppointment(upcoming[0]);
          }
        }
      } catch (err) {
        console.error('Profile load error:', err);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_id');
    navigate('/patient/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white flex flex-col flex-shrink-0`}
        style={{
          boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 40
        }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#146ef5' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold" style={{ color: '#080808' }}>Healthcare</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            style={{ color: '#363636' }}
          >
            {Icons.menu()}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 ${
                  isActive ? 'font-medium' : ''
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#146ef5' : 'transparent',
                color: isActive ? '#ffffff' : '#363636',
              })}
            >
              <span className="text-lg">{Icons[item.icon]()}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {nextAppointment && sidebarOpen && (
          <div className="mx-4 mb-4 p-4 rounded-xl flex-shrink-0" style={{ backgroundColor: '#f0f7ff' }}>
            <div className="flex items-center gap-2 mb-2">
              {Icons.clock()}
              <span className="text-xs font-medium" style={{ color: '#146ef5' }}>Next Appointment</span>
            </div>
            <p className="font-semibold text-sm truncate" style={{ color: '#080808' }}>
              {nextAppointment.doctor_name || `Doctor #${nextAppointment.doctor_id}`}
            </p>
            <p className="text-sm" style={{ color: '#5a5a5a' }}>
              {isToday(nextAppointment.appointment_date) ? 'Today' : formatDate(nextAppointment.appointment_date)} at {nextAppointment.appointment_time}
            </p>
          </div>
        )}

        {profile && sidebarOpen && (
          <div className="px-4 py-3 mx-4 mb-2 rounded flex-shrink-0" style={{ backgroundColor: '#f9fafb' }}>
            <p className="text-sm font-medium truncate" style={{ color: '#080808' }}>{profile.full_name}</p>
            <p className="text-xs truncate" style={{ color: '#5a5a5a' }}>{profile.email}</p>
          </div>
        )}

        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded transition-colors hover:bg-red-50"
            style={{ color: '#dc2626' }}
          >
            {Icons.logout()}
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <main 
        className="flex-1 overflow-y-auto"
        style={{ 
          marginLeft: sidebarOpen ? '18rem' : '5rem',
          transition: 'margin-left 0.3s'
        }}
      >
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
