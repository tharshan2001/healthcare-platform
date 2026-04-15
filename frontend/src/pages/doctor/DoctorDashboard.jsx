import { useState, useEffect } from 'react';
import { doctorAPI } from '../../api/doctor';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(null);
  const [newAvailability, setNewAvailability] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', is_available: true });
  const [newPrescription, setNewPrescription] = useState({ patient_id: '', medication_details: '', dosage: '', notes: '' });
  const [activeTab, setActiveTab] = useState('appointments');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const profileData = await doctorAPI.getProfile();
      if (profileData.detail === 'Invalid token') {
        navigate('/doctor/login');
        return;
      }
      setProfile(profileData);
      localStorage.setItem('doctor_id', profileData.id);

      const [avail, pres, apts, notif] = await Promise.all([
        doctorAPI.getMyAvailability(),
        doctorAPI.getMyPrescriptions(),
        doctorAPI.getMyAppointments(),
        fetch(`http://localhost:8004/notifications/${profileData.id}`).then(r => r.json()).catch(() => []),
      ]);
      setAvailability(avail);
      setPrescriptions(pres);
      setAppointments(apts.filter((a) => a.doctor_id === profileData.id));
      setNotifications(notif);
      setUnreadCount(notif.filter((n) => n.status === 'unread').length);
    };

    loadData();
  }, [navigate]);

  const handleLogout = () => {
    doctorAPI.logout();
    navigate('/doctor/login');
  };

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    await doctorAPI.addAvailability(newAvailability);
    setShowAvailabilityForm(false);
    setAvailability(await doctorAPI.getMyAvailability());
  };

  const handleDeleteAvailability = async (id) => {
    await doctorAPI.deleteAvailability(id);
    setAvailability(await doctorAPI.getMyAvailability());
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    await doctorAPI.createPrescription(newPrescription);
    setShowPrescriptionForm(null);
    setNewPrescription({ patient_id: '', medication_details: '', dosage: '', notes: '' });
    setPrescriptions(await doctorAPI.getMyPrescriptions());
  };

  const handleUpdateAppointment = async (id, status) => {
    const result = await doctorAPI.updateAppointment(id, { status });
    if (result.id) {
      setAppointments(await doctorAPI.getMyAppointments());
    }
  };

  const handleCreateTelemedicineFromAppointment = (apt) => {
    const params = new URLSearchParams({
      role: 'doctor',
      source: 'appointment',
      appointmentId: String(apt.id),
      doctorId: String(apt.doctor_id),
      patientId: String(apt.patient_id),
      durationMin: '30',
    });

    const timeText = String(apt.appointment_time || '').slice(0, 5);
    const startDate = new Date(`${apt.appointment_date}T${timeText || '00:00'}`);
    if (!Number.isNaN(startDate.getTime())) {
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      params.set('startAt', startDate.toISOString());
      params.set('endAt', endDate.toISOString());
    }

    navigate(`/telemedicine?${params.toString()}`);
  };

  const getAppointmentStatusClass = (status) => {
    if (status === 'scheduled') return 'bg-yellow-100 text-yellow-800';
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Doctor Dashboard</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="relative bg-green-700 px-4 py-2 rounded hover:bg-green-600"
            >
              Alerts
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <span className="hidden md:inline">{profile?.full_name}</span>
            <button onClick={() => navigate('/telemedicine?role=doctor')} className="bg-green-700 px-4 py-2 rounded hover:bg-green-600">
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
                  <div key={n.id} className={`p-3 rounded-lg ${n.status === 'unread' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-gray-50'}`}>
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
        {profile && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Dr. {profile.full_name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-gray-500 text-sm">Specialty</p><p className="font-medium">{profile.specialty}</p></div>
              <div><p className="text-gray-500 text-sm">Experience</p><p className="font-medium">{profile.years_of_experience} years</p></div>
              <div><p className="text-gray-500 text-sm">Consultation Fee</p><p className="font-medium">Rs. {profile.consultation_fee}</p></div>
              <div><p className="text-gray-500 text-sm">License</p><p className="font-medium">{profile.license_number}</p></div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('appointments')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'appointments' ? 'bg-green-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            Appointments ({appointments.length})
          </button>
          <button 
            onClick={() => setActiveTab('availability')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'availability' ? 'bg-green-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            Availability
          </button>
          <button 
            onClick={() => setActiveTab('prescriptions')} 
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'prescriptions' ? 'bg-green-600 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
          >
            Prescriptions ({prescriptions.length})
          </button>
        </div>

        {activeTab === 'appointments' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Today's Appointments</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="border p-4 rounded-lg">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div className="flex-1">
                        <p className="font-bold text-lg">Patient ID: {apt.patient_id}</p>
                        <p className="text-gray-600">{apt.appointment_date} at {apt.appointment_time}</p>
                        <p className="text-sm text-gray-500 mt-1">{apt.reason_for_visit}</p>
                      </div>
                      <div className="mt-2 md:mt-0 flex flex-col md:items-end gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getAppointmentStatusClass(apt.status)}`}>
                          {apt.status}
                        </span>
                        {apt.status === 'scheduled' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreateTelemedicineFromAppointment(apt)}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                            >
                              Telemedicine
                            </button>
                            <button
                              onClick={() => handleUpdateAppointment(apt.id, 'completed')}
                              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                            >
                              Complete
                            </button>
                            <button 
                              onClick={() => handleUpdateAppointment(apt.id, 'cancelled')}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Schedule</h2>
              <button 
                onClick={() => setShowAvailabilityForm(!showAvailabilityForm)} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Add Slot
              </button>
            </div>
            {showAvailabilityForm && (
              <form onSubmit={handleAddAvailability} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <select 
                    value={newAvailability.day_of_week} 
                    onChange={(e) => setNewAvailability({ ...newAvailability, day_of_week: e.target.value })} 
                    className="border p-2 rounded"
                  >
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <input 
                    type="time" 
                    value={newAvailability.start_time} 
                    onChange={(e) => setNewAvailability({ ...newAvailability, start_time: e.target.value })} 
                    className="border p-2 rounded"
                  />
                  <input 
                    type="time" 
                    value={newAvailability.end_time} 
                    onChange={(e) => setNewAvailability({ ...newAvailability, end_time: e.target.value })} 
                    className="border p-2 rounded"
                  />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Save
                  </button>
                </div>
              </form>
            )}
            {availability.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No availability set. Add your working hours!</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availability.map((a) => (
                  <div key={a.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">{a.day_of_week}</p>
                      <p className="text-gray-600">{a.start_time} - {a.end_time}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAvailability(a.id)} 
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Prescriptions</h2>
            {showPrescriptionForm && (
              <form onSubmit={handleCreatePrescription} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <input 
                    type="number" 
                    placeholder="Patient ID" 
                    value={newPrescription.patient_id} 
                    onChange={(e) => setNewPrescription({ ...newPrescription, patient_id: e.target.value })} 
                    className="border p-2 rounded"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Medication Details" 
                    value={newPrescription.medication_details} 
                    onChange={(e) => setNewPrescription({ ...newPrescription, medication_details: e.target.value })} 
                    className="border p-2 rounded"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Dosage (e.g., 2 times daily)" 
                    value={newPrescription.dosage} 
                    onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })} 
                    className="border p-2 rounded"
                  />
                  <input 
                    type="text" 
                    placeholder="Notes" 
                    value={newPrescription.notes} 
                    onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })} 
                    className="border p-2 rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Create Prescription
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowPrescriptionForm(null)} 
                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <button 
              onClick={() => setShowPrescriptionForm(true)} 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
            >
              + New Prescription
            </button>
            {prescriptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No prescriptions issued yet</p>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div key={p.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Patient ID: {p.patient_id}</p>
                        <p className="text-gray-700 mt-1">{p.medication_details}</p>
                        {p.dosage && <p className="text-sm text-gray-500">Dosage: {p.dosage}</p>}
                        {p.notes && <p className="text-sm text-gray-500">Notes: {p.notes}</p>}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(p.issued_at).toLocaleDateString()}
                      </span>
                    </div>
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