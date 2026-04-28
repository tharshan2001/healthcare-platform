import { useState, useEffect } from 'react';
import { doctorAPI } from '../../api/doctor';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const profileData = await doctorAPI.getProfile();
      
      if (profileData.detail === 'Invalid token') {
        navigate('/doctor/login');
        return;
      }
      if (!profileData.id) return;
      
      setProfile(profileData);
      
      const [apts, presc, avail] = await Promise.all([
        doctorAPI.getMyAppointments(),
        doctorAPI.getMyPrescriptions(),
        doctorAPI.getMyAvailability()
      ]);
      
      setAppointments(Array.isArray(apts) ? apts.filter(a => a.doctor_id === profileData.id) : []);
      setPrescriptions(Array.isArray(presc) ? presc : []);
      setAvailability(Array.isArray(avail) ? avail : []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const todayApts = appointments.filter(apt => apt.appointment_date === new Date().toISOString().split('T')[0]);
  const upcomingApts = appointments.filter(apt => apt.status === 'scheduled');
  const completedApts = appointments.filter(apt => apt.status === 'completed');

  const handleUpdateAppointment = async (id, status) => {
    await doctorAPI.updateAppointment(id, { status });
    loadData();
  };

  const handleStartTelemedicine = () => {
    navigate('/telemedicine?role=doctor');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, Dr. {profile?.full_name?.split(' ').pop()}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/doctor/appointments')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">{appointments.length}</p>
          <p className="text-sm text-gray-500">Total Appointments</p>
        </button>

        <button
          onClick={() => navigate('/doctor/appointments')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">{completedApts.length}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </button>

        <button
          onClick={() => navigate('/doctor/prescriptions')}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">{prescriptions.length}</p>
          <p className="text-sm text-gray-500">Prescriptions</p>
        </button>

        <button
          onClick={handleStartTelemedicine}
          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">Start</p>
          <p className="text-sm text-gray-500">Telemedicine</p>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-blue-600 font-semibold">{todayApts.length}</p>
          <p className="text-sm text-blue-600/70">Today</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl">
          <p className="text-yellow-600 font-semibold">{upcomingApts.length}</p>
          <p className="text-sm text-yellow-600/70">Upcoming</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-xl">
          <p className="text-gray-600 font-semibold">{availability.length}</p>
          <p className="text-sm text-gray-600/70">Schedule Slots</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Today's Schedule</h2>
          <button
            onClick={handleStartTelemedicine}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            Start Telemedicine
          </button>
        </div>
        <div className="p-4">
          {todayApts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No appointments scheduled for today</p>
              <button
                onClick={() => navigate('/doctor/schedule')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Manage Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayApts.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Patient #{apt.patient_id}</p>
                    <p className="text-sm text-gray-500">{formatDate(apt.appointment_date)} at {apt.appointment_time}</p>
                    {apt.reason_for_visit && (
                      <p className="text-sm text-gray-400 truncate">{apt.reason_for_visit}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      apt.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                      apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status}
                    </span>
                    {apt.status === 'scheduled' && (
                      <button
                        onClick={() => handleUpdateAppointment(apt.id, 'completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
