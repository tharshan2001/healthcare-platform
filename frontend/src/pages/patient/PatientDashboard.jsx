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
    const profileData = await patientAPI.getProfile();
    if (profileData.detail === 'Invalid token') {
      navigate('/patient/login');
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
    setAppointments(apt.filter(a => a.patient_id === profileData.id));
    setRecords(rec);
    setDoctors(docs);
    setNotifications(notif);
    setUnreadCount(notif.filter(n => n.status === 'unread').length);
  };

  const handleLogout = () => {
    patientAPI.logout();
    navigate('/patient/login');
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Patient Dashboard</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="relative bg-blue-700 px-4 py-2 rounded hover:bg-blue-600"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <span className="hidden md:inline">{profile?.full_name}</span>
            <button onClick={() => navigate('/telemedicine?role=patient')} className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-600">
              Telemedicine
            </button>
            <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">Logout</button>
          </div>
        </div>
      </nav>

      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 rounded-lg ${n.status === 'unread' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'}`}>
                    <p className="font-medium">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('doctors')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'doctors' ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            Find Doctors
          </button>
          <button 
            onClick={() => setActiveTab('appointments')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'appointments' ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            My Appointments ({appointments.length})
          </button>
          <button 
            onClick={() => setActiveTab('records')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'records' ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            Medical Records
          </button>
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            My Profile
          </button>
        </div>

        {activeTab === 'doctors' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Find Doctors</h2>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Search by specialty (e.g., General, Cardiology)..."
                value={searchSpecialty}
                onChange={(e) => setSearchSpecialty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchDoctors()}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button onClick={handleSearchDoctors} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Search
              </button>
            </div>
            {doctors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No doctors found</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="border p-4 rounded-lg hover:shadow-md transition">
                    <h3 className="font-bold text-lg">{doctor.full_name}</h3>
                    <p className="text-blue-600 font-medium">{doctor.specialty}</p>
                    <p className="text-gray-500 text-sm mt-1">{doctor.qualifications}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-green-600 font-bold text-lg">Rs. {doctor.consultation_fee}</span>
                      <button 
                        onClick={() => handleViewAvailability(doctor.id)} 
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showBooking && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-md w-full">
                  <h3 className="text-lg font-bold mb-4">
                    Book with {doctors.find(d => d.id === showBooking)?.full_name}
                  </h3>
                  {availability.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium mb-2">Doctor's Available Slots:</p>
                      {availability.map((a) => (
                        <p key={a.id} className="text-sm text-gray-600">
                          {a.day_of_week}: {a.start_time} - {a.end_time}
                        </p>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleBookAppointment}>
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-2">Appointment Date</label>
                      <input 
                        type="date" 
                        value={bookingData.appointment_date} 
                        onChange={(e) => setBookingData({ ...bookingData, appointment_date: e.target.value })} 
                        className="w-full px-3 py-2 border rounded-lg" 
                        required 
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-2">Appointment Time</label>
                      <input 
                        type="time" 
                        value={bookingData.appointment_time} 
                        onChange={(e) => setBookingData({ ...bookingData, appointment_time: e.target.value })} 
                        className="w-full px-3 py-2 border rounded-lg" 
                        required 
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-2">Reason for Visit</label>
                      <input 
                        type="text" 
                        value={bookingData.reason_for_visit} 
                        onChange={(e) => setBookingData({ ...bookingData, reason_for_visit: e.target.value })} 
                        className="w-full px-3 py-2 border rounded-lg" 
                        placeholder="e.g., Annual checkup, headache..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                        Confirm Booking
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowBooking(null)} 
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
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
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">My Appointments</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No appointments yet. Browse doctors to book an appointment!</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{getDoctorName(apt.doctor_id)}</p>
                      <p className="text-gray-600">{apt.appointment_date} at {apt.appointment_time}</p>
                      <p className="text-sm text-gray-500 mt-1">{apt.reason_for_visit}</p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        apt.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                        apt.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {apt.status}
                      </span>
                      {apt.payment_status && (
                        <span className={`ml-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          apt.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                          apt.payment_status === 'pending' ? 'bg-orange-100 text-orange-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {apt.payment_status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Medical Records</h2>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
                  <input type="file" name="file" className="border p-2 rounded flex-1" />
                  <select name="record_type" className="border p-2 rounded">
                    <option value="report">Medical Report</option>
                    <option value="prescription">Prescription</option>
                    <option value="lab">Lab Result</option>
                    <option value="imaging">Imaging</option>
                  </select>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Upload
                  </button>
                </div>
              </form>
            </div>
            {records.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No records uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div key={record.id} className="border p-3 rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium">{record.file_name}</p>
                      <p className="text-sm text-gray-500 capitalize">{record.record_type}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(record.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && profile && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">My Profile</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><p className="text-gray-500">Full Name</p><p className="font-medium">{profile.full_name}</p></div>
              <div><p className="text-gray-500">Email</p><p className="font-medium">{profile.email}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{profile.phone || 'Not provided'}</p></div>
              <div><p className="text-gray-500">Date of Birth</p><p className="font-medium">{profile.date_of_birth || 'Not provided'}</p></div>
              <div><p className="text-gray-500">Gender</p><p className="font-medium capitalize">{profile.gender || 'Not provided'}</p></div>
              <div><p className="text-gray-500">Address</p><p className="font-medium">{profile.address || 'Not provided'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}