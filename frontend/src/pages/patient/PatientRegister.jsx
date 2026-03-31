import { useState } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';

export default function PatientRegister() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await patientAPI.register(formData);
      if (result.id) {
        navigate('/patient/login');
      } else {
        setError(result.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Patient Registration</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Full Name</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Date of Birth</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" rows="2" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          Already have an account? <a href="/patient/login" className="text-blue-600">Login</a>
        </p>
      </div>
    </div>
  );
}