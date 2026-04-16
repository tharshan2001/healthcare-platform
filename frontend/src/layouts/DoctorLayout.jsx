import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { doctorAPI } from '../api/doctor';
import { Icons } from '../components/Icons';

const menuItems = [
  { path: '/doctor/dashboard', icon: 'home', label: 'Dashboard' },
  { path: '/doctor/appointments', icon: 'calendar', label: 'Appointments' },
  { path: '/doctor/schedule', icon: 'schedule', label: 'Schedule' },
  { path: '/doctor/patients', icon: 'user', label: 'Patients' },
  { path: '/doctor/prescriptions', icon: 'clipboard', label: 'Prescriptions' },
  { path: '/doctor/availability', icon: 'clock', label: 'Availability' },
  { path: '/doctor/telemedicine', icon: 'video', label: 'Telemedicine' },
  { path: '/doctor/profile', icon: 'doctor', label: 'Profile' },
];

export default function DoctorLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await doctorAPI.getProfile();
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
    localStorage.removeItem('doctor_token');
    navigate('/doctor/login');
  };

  const IconComponent = ({ name }) => {
    const iconMap = {
      home: Icons.home,
      calendar: Icons.calendar,
      schedule: Icons.schedule,
      user: Icons.user,
      clipboard: Icons.clipboard,
      clock: Icons.clock,
      video: Icons.video,
      doctor: Icons.doctor,
    };
    const Icon = iconMap[name];
    return Icon ? <Icon /> : null;
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white flex flex-col transition-all duration-300`}
        style={{
          boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px'
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
            className="p-2 rounded hover:bg-gray-100"
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
                `flex items-center gap-3 px-3 py-2.5 rounded transition-all ${isActive ? 'font-medium' : ''}`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#146ef5' : 'transparent',
                color: isActive ? '#ffffff' : '#363636',
              })}
            >
              <IconComponent name={item.icon} />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {profile && sidebarOpen && (
          <div className="px-4 py-3 mx-4 mb-2 rounded" style={{ backgroundColor: '#f5f5f5' }}>
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs truncate" style={{ color: '#5a5a5a' }}>{profile.specialty}</p>
          </div>
        )}

        <div className="p-4 border-t" style={{ borderColor: '#d8d8d8' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded hover:bg-red-50"
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