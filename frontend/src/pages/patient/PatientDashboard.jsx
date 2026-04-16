import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [showBooking, setShowBooking] = useState(null);
  const [bookingData, setBookingData] = useState({ appointment_date: '', appointment_time: '', reason_for_visit: '' });
  const [availability, setAvailability] = useState([]);
  const [activeTab, setActiveTab] = useState('doctors');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profileData = await patientAPI.getProfile();
      if (profileData.detail === 'Invalid token') {
        navigate('/patient/login');
        return;
      }
      if (!profileData.id) {
        console.error('No profile ID returned');
        return;
      }
      setProfile(profileData);
      localStorage.setItem('patient_id', profileData.id);
      
      const [apt, rec, docs, notif] = await Promise.all([
        patientAPI.getAppointments(),
        patientAPI.getRecords(),
        patientAPI.getDoctors(),
        patientAPI.getNotifications()
      ]);
      setAppointments(apt?.filter(a => a.patient_id === profileData.id) || []);
      setRecords(rec || []);
      setDoctors(docs || []);
      setNotifications(notif || []);
      setUnreadCount((notif || []).filter(n => n.status === 'unread').length);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSearchDoctors = async () => {
    setDoctors(await patientAPI.getDoctors(searchSpecialty));
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
      const apt = await patientAPI.getAppointments();
      setAppointments(apt.filter(a => a.patient_id === profile.id));
      alert('Appointment booked successfully!');
    } else {
      alert(result.detail || 'Failed to book appointment');
    }
  };

  const getDoctorName = (doctorId) => {
    const doc = doctors.find(d => d.id === doctorId);
    return doc ? doc.full_name : `Doctor #${doctorId}`;
  };

  if (!profile) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#080808' }}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Patient'}</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a5a' }}>Manage your health journey from here</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="relative px-4 py-2 rounded transition-all hover:bg-gray-100"
            style={{ backgroundColor: '#ffffff', color: '#363636', border: '1px solid #d8d8d8' }}
          >
            <span className="flex items-center gap-2">
              <span>🔔</span>
              <span className="text-sm font-medium">Notifications</span>
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ee1d36' }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => navigate('/telemedicine?role=patient')}
            className="px-4 py-2 rounded transition-all hover:opacity-90"
            style={{ backgroundColor: '#146ef5', color: '#ffffff' }}
          >
            <span className="text-sm font-medium">Start Telemedicine</span>
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(8,8,8,0.5)' }}>
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: '#d8d8d8' }}>
              <h3 className="text-lg font-semibold" style={{ color: '#080808' }}>Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 rounded" style={{ color: '#5a5a5a' }}>✕</button>
            </div>
            <div className="p-4">
              {notifications.length === 0 ? (
                <p className="text-center py-8" style={{ color: '#5a5a5a' }}>No notifications</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className="p-3 rounded-lg"
                      style={{ 
                        backgroundColor: n.status === 'unread' ? '#f0f7ff' : '#f5f5f5',
                        borderLeft: n.status === 'unread' ? '3px solid #146ef5' : '3px solid #d8d8d8'
                      }}
                    >
                      <p className="font-medium text-sm" style={{ color: '#080808' }}>{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: '#5a5a5a' }}>{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('doctors')} 
          className="px-4 py-2 rounded transition-all text-sm font-medium"
          style={{ 
            backgroundColor: activeTab === 'doctors' ? '#146ef5' : '#ffffff',
            color: activeTab === 'doctors' ? '#ffffff' : '#363636',
            border: '1px solid #d8d8d8'
          }}
        >
          Find Doctors
        </button>
        <button 
          onClick={() => setActiveTab('appointments')} 
          className="px-4 py-2 rounded transition-all text-sm font-medium"
          style={{ 
            backgroundColor: activeTab === 'appointments' ? '#146ef5' : '#ffffff',
            color: activeTab === 'appointments' ? '#ffffff' : '#363636',
            border: '1px solid #d8d8d8'
          }}
        >
          My Appointments ({appointments.length})
        </button>
        <button 
          onClick={() => setActiveTab('records')} 
          className="px-4 py-2 rounded transition-all text-sm font-medium"
          style={{ 
            backgroundColor: activeTab === 'records' ? '#146ef5' : '#ffffff',
            color: activeTab === 'records' ? '#ffffff' : '#363636',
            border: '1px solid #d8d8d8'
          }}
        >
          Medical Records
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className="px-4 py-2 rounded transition-all text-sm font-medium"
          style={{ 
            backgroundColor: activeTab === 'profile' ? '#146ef5' : '#ffffff',
            color: activeTab === 'profile' ? '#ffffff' : '#363636',
            border: '1px solid #d8d8d8'
          }}
        >
          My Profile
        </button>
      </div>

      {activeTab === 'doctors' && (
        <div className="bg-white p-6 rounded-lg" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#080808' }}>Find Doctors</h2>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Search by specialty (e.g., General, Cardiology)..."
              value={searchSpecialty}
              onChange={(e) => setSearchSpecialty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchDoctors()}
              className="flex-1 px-4 py-2 rounded-lg"
              style={{ border: '1px solid #d8d8d8' }}
            />
            <button 
              onClick={handleSearchDoctors} 
              className="px-6 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: '#146ef5' }}
            >
              Search
            </button>
          </div>
          {doctors.length === 0 ? (
            <p className="text-center py-8" style={{ color: '#5a5a5a' }}>No doctors found</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doctor) => (
                <div 
                  key={doctor.id} 
                  className="border p-4 rounded-lg"
                  style={{ borderColor: '#d8d8d8' }}
                >
                  <h3 className="font-bold text-lg" style={{ color: '#080808' }}>{doctor.full_name}</h3>
                  <p className="font-medium" style={{ color: '#146ef5' }}>{doctor.specialty}</p>
                  <p className="text-sm mt-1" style={{ color: '#5a5a5a' }}>{doctor.qualifications}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-lg" style={{ color: '#00d722' }}>Rs. {doctor.consultation_fee}</span>
                    <button 
                      onClick={() => handleViewAvailability(doctor.id)} 
                      className="px-4 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: '#00d722' }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showBooking && (
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(8,8,8,0.5)' }}>
              <div className="bg-white p-6 rounded-lg max-w-md w-full" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#080808' }}>
                  Book with {doctors.find(d => d.id === showBooking)?.full_name}
                </h3>
                {availability.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#f0f7ff' }}>
                    <p className="font-medium mb-2" style={{ color: '#080808' }}>Doctor's Available Slots:</p>
                    {availability.map((a) => (
                      <p key={a.id} className="text-sm" style={{ color: '#363636' }}>
                        {a.day_of_week}: {a.start_time} - {a.end_time}
                      </p>
                    ))}
                  </div>
                )}
                <form onSubmit={handleBookAppointment}>
                  <div className="mb-3">
                    <label className="block mb-2" style={{ color: '#363636' }}>Appointment Date</label>
                    <input 
                      type="date" 
                      value={bookingData.appointment_date} 
                      onChange={(e) => setBookingData({ ...bookingData, appointment_date: e.target.value })} 
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ border: '1px solid #d8d8d8' }}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block mb-2" style={{ color: '#363636' }}>Appointment Time</label>
                    <input 
                      type="time" 
                      value={bookingData.appointment_time} 
                      onChange={(e) => setBookingData({ ...bookingData, appointment_time: e.target.value })} 
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ border: '1px solid #d8d8d8' }}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block mb-2" style={{ color: '#363636' }}>Reason for Visit</label>
                    <input 
                      type="text" 
                      value={bookingData.reason_for_visit} 
                      onChange={(e) => setBookingData({ ...bookingData, reason_for_visit: e.target.value })} 
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ border: '1px solid #d8d8d8' }}
                      placeholder="e.g., Annual checkup, headache..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 rounded text-white font-medium" style={{ backgroundColor: '#146ef5' }}>
                      Confirm Booking
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowBooking(null)} 
                      className="flex-1 py-2 rounded font-medium"
                      style={{ backgroundColor: '#d8d8d8', color: '#363636' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="bg-white p-6 rounded-lg" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#080808' }}>My Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-center py-8" style={{ color: '#5a5a5a' }}>No appointments yet. Browse doctors to book an appointment!</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div 
                  key={apt.id} 
                  className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center"
                  style={{ borderColor: '#d8d8d8' }}
                >
                  <div className="flex-1">
                    <p className="font-bold text-lg" style={{ color: '#080808' }}>{getDoctorName(apt.doctor_id)}</p>
                    <p style={{ color: '#363636' }}>{apt.appointment_date} at {apt.appointment_time}</p>
                    <p className="text-sm mt-1" style={{ color: '#5a5a5a' }}>{apt.reason_for_visit}</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: apt.status === 'scheduled' ? '#fff3cd' : apt.status === 'completed' ? '#d4edda' : apt.status === 'cancelled' ? '#f8d7da' : '#e2e3e5',
                        color: apt.status === 'scheduled' ? '#856404' : apt.status === 'completed' ? '#155724' : apt.status === 'cancelled' ? '#721c24' : '#383d41'
                      }}
                    >
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white p-6 rounded-lg" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#080808' }}>Medical Records</h2>
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const file = e.target.file.files[0];
              const type = e.target.record_type.value;
              if (file) {
                await patientAPI.uploadRecord(file, type);
                setRecords(await patientAPI.getRecords());
              }
            }}>
              <div className="flex flex-wrap gap-2">
                <input type="file" name="file" className="border p-2 rounded flex-1" style={{ borderColor: '#d8d8d8' }} />
                <select name="record_type" className="border p-2 rounded" style={{ borderColor: '#d8d8d8' }}>
                  <option value="report">Medical Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="lab">Lab Results</option>
                  <option value="imaging">Imaging</option>
                  <option value="other">Other</option>
                </select>
                <button type="submit" className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: '#146ef5' }}>Upload</button>
              </div>
            </form>
          </div>
          {records.length === 0 ? (
            <p className="text-center py-8" style={{ color: '#5a5a5a' }}>No records uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="border p-3 rounded flex justify-between items-center" style={{ borderColor: '#d8d8d8' }}>
                  <div>
                    <p className="font-medium" style={{ color: '#080808' }}>{record.file_name}</p>
                    <p className="text-sm" style={{ color: '#5a5a5a' }}>{record.record_type}</p>
                  </div>
                  <span className="text-xs" style={{ color: '#5a5a5a' }}>
                    {new Date(record.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && profile && (
        <div className="bg-white p-6 rounded-lg" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#080808' }}>My Profile</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Full Name</p>
              <p className="font-medium" style={{ color: '#080808' }}>{profile.full_name}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Email</p>
              <p className="font-medium" style={{ color: '#080808' }}>{profile.email}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Phone</p>
              <p className="font-medium" style={{ color: '#080808' }}>{profile.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Date of Birth</p>
              <p className="font-medium" style={{ color: '#080808' }}>{profile.date_of_birth || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Gender</p>
              <p className="font-medium capitalize" style={{ color: '#080808' }}>{profile.gender || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#5a5a5a' }}>Address</p>
              <p className="font-medium" style={{ color: '#080808' }}>{profile.address || 'Not provided'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}