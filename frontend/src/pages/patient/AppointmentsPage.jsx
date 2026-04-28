import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';

export default function AppointmentsPage() {
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(null);
  const [bookingData, setBookingData] = useState({ appointment_date: '', appointment_time: '', reason_for_visit: '' });
  const [availability, setAvailability] = useState([]);
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
      
      setProfile(profileData);
      localStorage.setItem('patient_id', profileData.id);
      
      const allAppointments = await patientAPI.getAppointments();
      const myAppointments = Array.isArray(allAppointments) 
        ? allAppointments.filter(apt => apt.patient_id === profileData.id)
        : [];
      
      setAppointments(myAppointments);
      
      const docs = await patientAPI.getDoctors();
      setDoctors(docs || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleViewAvailability = async (doctorId) => {
    setAvailability(await patientAPI.getDoctorAvailability(doctorId));
    setShowBooking(doctorId);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    const result = await patientAPI.createAppointment({
      doctor_id: showBooking,
      patient_id: profile.id,
      patient_email: profile.email,
      patient_phone: profile.phone,
      doctor_name: doctors.find(d => d.id === showBooking)?.full_name,
      ...bookingData,
    });
    if (result.id) {
      setShowBooking(null);
      setBookingData({ appointment_date: '', appointment_time: '', reason_for_visit: '' });
      loadData();
    } else {
      alert(result.detail || 'Failed to book');
    }
  };

  const getDoctorName = (doctorId) => {
    const doc = doctors.find(d => d.id === doctorId);
    return doc ? doc.full_name : `Doctor #${doctorId}`;
  };

  const getDoctorInfo = (doctorId) => {
    return doctors.find(d => d.id === doctorId);
  };

  const upcomingAppointments = appointments.filter(apt => apt.status === 'scheduled');
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
      case 'completed': return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'cancelled': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isPast = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#080808' }}>My Appointments</h1>
        <button 
          onClick={() => navigate('/doctor-search')}
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: '#146ef5' }}
        >
          + Book New Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
              <span className="text-xl">⏰</span>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Upcoming</p>
              <p className="text-2xl font-bold" style={{ color: '#146ef5' }}>{upcomingAppointments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d1fae5' }}>
              <span className="text-xl">✅</span>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Completed</p>
              <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{completedAppointments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
              <span className="text-xl">❌</span>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Cancelled</p>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{cancelledAppointments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="text-6xl">📅</span>
          <h3 className="text-xl font-semibold mt-4 mb-2" style={{ color: '#080808' }}>No appointments yet</h3>
          <p className="mb-4" style={{ color: '#5a5a5a' }}>Book your first appointment with a doctor</p>
          <button 
            onClick={() => navigate('/doctor-search')}
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#146ef5' }}
          >
            Find Doctors
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => {
            const statusColors = getStatusColor(apt.status);
            const doctor = getDoctorInfo(apt.doctor_id);
            return (
              <div 
                key={apt.id} 
                className="bg-white p-5 rounded-xl"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${statusColors.border}` }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#f0f7ff', color: '#146ef5' }}>
                      {doctor?.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <p className="font-semibold text-lg" style={{ color: '#080808' }}>{getDoctorName(apt.doctor_id)}</p>
                      <p className="text-sm" style={{ color: '#5a5a5a' }}>{doctor?.specialty || 'General'}</p>
                      {apt.reason_for_visit && (
                        <p className="text-sm mt-1" style={{ color: '#5a5a5a' }}>
                          <span className="font-medium">Reason:</span> {apt.reason_for_visit}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-center px-4 py-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <p className={`text-lg font-bold ${isToday(apt.appointment_date) ? 'text-blue-600' : ''}`} style={{ color: '#363636' }}>
                        {isToday(apt.appointment_date) ? 'Today' : formatDate(apt.appointment_date)}
                      </p>
                      <p className="text-sm font-medium" style={{ color: '#5a5a5a' }}>{apt.appointment_time}</p>
                    </div>
                    <span 
                      className="px-4 py-2 rounded-full text-sm font-medium capitalize"
                      style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                    >
                      {apt.status}
                    </span>
                  </div>
                </div>
                
                {apt.status === 'scheduled' && !isPast(apt.appointment_date) && (
                  <div className="mt-4 pt-4 border-t flex gap-2" style={{ borderColor: '#e5e7eb' }}>
                    <button 
                      onClick={() => navigate(`/telemedicine?appointmentId=${apt.id}&role=patient`)}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                      style={{ backgroundColor: '#146ef5' }}
                    >
                      <span>📹</span> Join Consultation
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(8,8,8,0.5)' }}>
          <div className="bg-white p-6 rounded-xl max-w-md w-full" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#080808' }}>
                Book with {doctors.find(d => d.id === showBooking)?.full_name}
              </h3>
              <button onClick={() => setShowBooking(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {availability.length > 0 && (
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f0f7ff' }}>
                <p className="font-medium mb-2" style={{ color: '#080808' }}>Available Days:</p>
                {availability.map((a) => (
                  <p key={a.id} className="text-sm" style={{ color: '#363636' }}>
                    {a.day_of_week}: {a.start_time} - {a.end_time}
                  </p>
                ))}
              </div>
            )}
            <form onSubmit={handleBookAppointment}>
              <div className="mb-4">
                <label className="block mb-2 font-medium" style={{ color: '#363636' }}>Date</label>
                <input 
                  type="date" 
                  value={bookingData.appointment_date} 
                  onChange={(e) => setBookingData({ ...bookingData, appointment_date: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg"
                  style={{ border: '1px solid #e5e7eb' }}
                  required 
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium" style={{ color: '#363636' }}>Time</label>
                <input 
                  type="time" 
                  value={bookingData.appointment_time} 
                  onChange={(e) => setBookingData({ ...bookingData, appointment_time: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg"
                  style={{ border: '1px solid #e5e7eb' }}
                  required 
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium" style={{ color: '#363636' }}>Reason for Visit</label>
                <input 
                  type="text" 
                  value={bookingData.reason_for_visit} 
                  onChange={(e) => setBookingData({ ...bookingData, reason_for_visit: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg"
                  style={{ border: '1px solid #e5e7eb' }}
                  placeholder="e.g., Annual checkup..."
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-3 rounded-lg text-white font-medium" style={{ backgroundColor: '#146ef5' }}>
                  Confirm Booking
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowBooking(null)} 
                  className="flex-1 py-3 rounded-lg font-medium"
                  style={{ backgroundColor: '#f3f4f6', color: '#363636' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
