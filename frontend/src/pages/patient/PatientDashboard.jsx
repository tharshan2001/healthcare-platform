import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [showBooking, setShowBooking] = useState(null);
  const [bookingData, setBookingData] = useState({ appointment_date: '', appointment_time: '', reason_for_visit: '' });
  const [availability, setAvailability] = useState([]);
  const [activeTab, setActiveTab] = useState('doctors');
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
    setAppointments(await patientAPI.getAppointments());
    setRecords(await patientAPI.getRecords());
    setDoctors(await patientAPI.getDoctors());
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
      ...bookingData,
    });
    if (result.id) {
      setShowBooking(null);
      setAppointments(await patientAPI.getAppointments());
      alert('Appointment booked successfully!');
    } else {
      alert(result.detail || 'Failed to book appointment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Patient Dashboard</h1>
          <div className="flex items-center gap-4">
            <span>{profile?.full_name}</span>
            <button onClick={handleLogout} className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('doctors')} className={`px-4 py-2 rounded ${activeTab === 'doctors' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Find Doctors</button>
          <button onClick={() => setActiveTab('appointments')} className={`px-4 py-2 rounded ${activeTab === 'appointments' ? 'bg-blue-600 text-white' : 'bg-white'}`}>My Appointments</button>
          <button onClick={() => setActiveTab('records')} className={`px-4 py-2 rounded ${activeTab === 'records' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Medical Records</button>
        </div>

        {activeTab === 'doctors' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Find Doctors</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search by specialty..."
                value={searchSpecialty}
                onChange={(e) => setSearchSpecialty(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button onClick={handleSearchDoctors} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Search</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="border p-4 rounded-lg">
                  <h3 className="font-bold text-lg">{doctor.full_name}</h3>
                  <p className="text-gray-600">{doctor.specialty}</p>
                  <p className="text-gray-500 text-sm">{doctor.qualifications}</p>
                  <p className="text-green-600 font-bold mt-2">Rs. {doctor.consultation_fee}</p>
                  <button onClick={() => handleViewAvailability(doctor.id)} className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Book Appointment
                  </button>
                </div>
              ))}
            </div>
            {showBooking && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg max-w-md w-full">
                  <h3 className="text-lg font-bold mb-4">Book Appointment</h3>
                  {availability.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="font-medium mb-2">Available Slots:</p>
                      {availability.map((a) => (
                        <p key={a.id} className="text-sm">{a.day_of_week}: {a.start_time} - {a.end_time}</p>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleBookAppointment}>
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-2">Date</label>
                      <input type="date" value={bookingData.appointment_date} onChange={(e) => setBookingData({ ...bookingData, appointment_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-2">Time</label>
                      <input type="time" value={bookingData.appointment_time} onChange={(e) => setBookingData({ ...bookingData, appointment_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-2">Reason</label>
                      <input type="text" value={bookingData.reason_for_visit} onChange={(e) => setBookingData({ ...bookingData, reason_for_visit: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Book</button>
                      <button type="button" onClick={() => setShowBooking(null)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">Cancel</button>
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
              <p className="text-gray-500">No appointments yet</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="border p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-bold">Doctor ID: {apt.doctor_id}</p>
                      <p className="text-gray-600">{apt.appointment_date} at {apt.appointment_time}</p>
                      <p className="text-sm text-gray-500">{apt.reason_for_visit}</p>
                    </div>
                    <span className={`px-3 py-1 rounded ${apt.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : apt.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Medical Records</h2>
            <div className="mb-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const file = e.target.file.files[0];
                const type = e.target.record_type.value;
                if (file) {
                  await patientAPI.uploadRecord(file, type);
                  setRecords(await patientAPI.getRecords());
                }
              }}>
                <div className="flex gap-2">
                  <input type="file" name="file" className="border p-2 rounded" />
                  <select name="record_type" className="border p-2 rounded">
                    <option value="report">Medical Report</option>
                    <option value="prescription">Prescription</option>
                    <option value="lab">Lab Result</option>
                  </select>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Upload</button>
                </div>
              </form>
            </div>
            {records.length === 0 ? (
              <p className="text-gray-500">No records uploaded</p>
            ) : (
              <div className="space-y-2">
                {records.map((record) => (
                  <div key={record.id} className="border p-3 rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium">{record.file_name}</p>
                      <p className="text-sm text-gray-500">{record.record_type}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(record.uploaded_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}