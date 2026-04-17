import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
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
      if (!profileData.id) return;
      
      setProfile(profileData);
      
      const allAppointments = await patientAPI.getAppointments();
      const myAppointments = Array.isArray(allAppointments) 
        ? allAppointments.filter(apt => apt.patient_id === profileData.id)
        : [];
      
      setAppointments(myAppointments);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const upcomingAppointments = appointments.filter(apt => apt.status === 'scheduled');
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    return dateStr === new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/patient/appointments')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">Appointments</p>
          <p className="text-sm text-gray-500">{appointments.length} total</p>
        </button>

        <button
          onClick={() => navigate('/')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">Book New</p>
          <p className="text-sm text-gray-500">Find a doctor</p>
        </button>

        <button
          onClick={() => navigate('/telemedicine?role=patient')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">Video Call</p>
          <p className="text-sm text-gray-500">Consult online</p>
        </button>

        <button
          onClick={() => navigate('/patient/records')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">Records</p>
          <p className="text-sm text-gray-500">Medical files</p>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-blue-600 font-semibold">{upcomingAppointments.length}</p>
          <p className="text-sm text-blue-600/70">Upcoming</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl">
          <p className="text-green-600 font-semibold">{completedAppointments.length}</p>
          <p className="text-sm text-green-600/70">Completed</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-xl">
          <p className="text-gray-600 font-semibold">{appointments.length}</p>
          <p className="text-sm text-gray-600/70">Total</p>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
        </div>
        <div className="p-4">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No upcoming appointments</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 3).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {apt.doctor_name || `Doctor #${apt.doctor_id}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isToday(apt.appointment_date) ? 'Today' : formatDate(apt.appointment_date)} at {apt.appointment_time}
                    </p>
                  </div>
                  {isToday(apt.appointment_date) && (
                    <button
                      onClick={() => navigate('/telemedicine?role=patient')}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
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
    </div>
  );
}
