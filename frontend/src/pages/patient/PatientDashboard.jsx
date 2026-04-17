import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const profileData = await patientAPI.getProfile();
      
      if (profileData.detail === 'Invalid token') {
        navigate('/patient/login');
        return;
      }
      if (!profileData.id) {
        return;
      }
      
      setProfile(profileData);
      
      const [allAppointments, allRecords] = await Promise.all([
        patientAPI.getAppointments(),
        patientAPI.getRecords()
      ]);
      
      const myAppointments = Array.isArray(allAppointments) 
        ? allAppointments.filter(apt => apt.patient_id === profileData.id)
        : [];
      
      setAppointments(myAppointments);
      setRecords(Array.isArray(allRecords) ? allRecords : []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const upcomingAppointments = appointments.filter(apt => apt.status === 'scheduled');
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#080808' }}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Patient'}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a5a' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p className="text-sm mb-2" style={{ color: '#5a5a5a' }}>Upcoming Appointments</p>
          <p className="text-3xl font-bold" style={{ color: '#146ef5' }}>{upcomingAppointments.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p className="text-sm mb-2" style={{ color: '#5a5a5a' }}>Completed</p>
          <p className="text-3xl font-bold" style={{ color: '#10b981' }}>{completedAppointments.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p className="text-sm mb-2" style={{ color: '#5a5a5a' }}>Medical Records</p>
          <p className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{records.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#080808' }}>Upcoming Appointments</h3>
          <button 
            onClick={() => navigate('/patient/appointments')}
            className="text-sm font-medium"
            style={{ color: '#146ef5' }}
          >
            View All
          </button>
        </div>
        
        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: '#5a5a5a' }}>No upcoming appointments</p>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: '#146ef5' }}
            >
              Book Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.slice(0, 3).map((apt) => (
              <div 
                key={apt.id} 
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: '#f9fafb' }}
              >
                <div>
                  <p className="font-medium" style={{ color: '#080808' }}>
                    {apt.doctor_name || `Doctor #${apt.doctor_id}`}
                  </p>
                  <p className="text-sm" style={{ color: '#5a5a5a' }}>
                    {isToday(apt.appointment_date) ? 'Today' : formatDate(apt.appointment_date)} at {apt.appointment_time}
                  </p>
                </div>
                {isToday(apt.appointment_date) && (
                  <button 
                    onClick={() => navigate('/telemedicine?role=patient')}
                    className="px-3 py-1 rounded text-white text-sm font-medium"
                    style={{ backgroundColor: '#146ef5' }}
                  >
                    Join
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
