import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { patientAPI } from '../api/patient';
import { Icons } from '../components/Icons';

const menuItems = [
  { path: '/patient/dashboard', icon: 'home', label: 'Dashboard' },
  { path: '/patient/doctors', icon: 'doctor', label: 'Find Doctors' },
  { path: '/patient/appointments', icon: 'calendar', label: 'Appointments' },
  { path: '/patient/records', icon: 'clipboard', label: 'Medical Records' },
  { path: '/patient/telemedicine', icon: 'video', label: 'Telemedicine' },
  { path: '/patient/symptoms', icon: 'health', label: 'Symptom Checker' },
  { path: '/patient/profile', icon: 'user', label: 'Profile' },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await patientAPI.getProfile();
        if (data?.id) {
          setProfile(data);
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

  const IconComponent = ({ name }) => {
    const iconMap = {
      home: Icons.home,
      doctor: Icons.doctor,
      calendar: Icons.calendar,
      clipboard: Icons.clipboard,
      video: Icons.video,
      health: Icons.health,
      user: Icons.user,
    };
    const Icon = iconMap[name];
    return Icon ? <Icon /> : null;
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white flex flex-col transition-all duration-300`}
        style={{
          boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px, rgba(0,0,0,0.01) 0px 54px 22px, rgba(0,0,0,0) 0px 84px 24px'
        }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#d8d8d8' }}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#146ef5' }}>
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <h1 className="text-lg font-semibold" style={{ color: '#080808' }}>HealthCare</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            style={{ color: '#363636' }}
          >
            <Icons.menu />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
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
              <span className="text-lg"><IconComponent name={item.icon} /></span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {profile && sidebarOpen && (
          <div className="px-4 py-3 mx-4 mb-2 rounded" style={{ backgroundColor: '#f5f5f5' }}>
            <p className="text-sm font-medium truncate" style={{ color: '#080808' }}>{profile.full_name}</p>
            <p className="text-xs truncate" style={{ color: '#5a5a5a' }}>{profile.email}</p>
          </div>
        )}

        <div className="p-4 border-t" style={{ borderColor: '#d8d8d8' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded transition-colors hover:bg-red-50"
            style={{ color: '#ee1d36' }}
          >
            <Icons.logout />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}