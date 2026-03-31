import { useState, useEffect } from 'react';
import { doctorAPI } from '../../api/doctor';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [newAvailability, setNewAvailability] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', is_available: true });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const profileData = await doctorAPI.getProfile();
    if (profileData.detail === 'Invalid token') {
      navigate('/doctor/login');
      return;
    }
    setProfile(profileData);
    setAvailability(await doctorAPI.getMyAvailability());
    setPrescriptions(await doctorAPI.getMyPrescriptions());
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Doctor Dashboard</h1>
          <button onClick={handleLogout} className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {profile && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-gray-500">Name</p><p className="font-medium">{profile.full_name}</p></div>
              <div><p className="text-gray-500">Email</p><p className="font-medium">{profile.email}</p></div>
              <div><p className="text-gray-500">Specialty</p><p className="font-medium">{profile.specialty}</p></div>
              <div><p className="text-gray-500">Fee</p><p className="font-medium">Rs. {profile.consultation_fee}</p></div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Availability</h2>
              <button onClick={() => setShowAvailabilityForm(!showAvailabilityForm)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                + Add
              </button>
            </div>
            {showAvailabilityForm && (
              <form onSubmit={handleAddAvailability} className="mb-4 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <select value={newAvailability.day_of_week} onChange={(e) => setNewAvailability({ ...newAvailability, day_of_week: e.target.value })} className="border p-2 rounded">
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                  </select>
                  <input type="time" value={newAvailability.start_time} onChange={(e) => setNewAvailability({ ...newAvailability, start_time: e.target.value })} className="border p-2 rounded" />
                  <input type="time" value={newAvailability.end_time} onChange={(e) => setNewAvailability({ ...newAvailability, end_time: e.target.value })} className="border p-2 rounded" />
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                </div>
              </form>
            )}
            {availability.length === 0 ? <p className="text-gray-500">No availability set</p> : (
              <ul className="space-y-2">
                {availability.map(a => (
                  <li key={a.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <span>{a.day_of_week}: {a.start_time} - {a.end_time}</span>
                    <button onClick={() => handleDeleteAvailability(a.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Prescriptions Issued</h2>
            {prescriptions.length === 0 ? <p className="text-gray-500">No prescriptions yet</p> : (
              <ul className="space-y-2">
                {prescriptions.map(p => (
                  <li key={p.id} className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Patient ID: {p.patient_id}</p>
                    <p className="text-sm text-gray-600">{p.medication_details}</p>
                    <p className="text-xs text-gray-500">{new Date(p.issued_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}