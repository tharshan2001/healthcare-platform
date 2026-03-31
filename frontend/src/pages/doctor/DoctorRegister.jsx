import { useState } from 'react';
import { doctorAPI } from '../../api/doctor';
import { useNavigate } from 'react-router-dom';

export default function DoctorRegister() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    specialty: '',
    qualifications: '',
    license_number: '',
    consultation_fee: 0,
    years_of_experience: 0,
    bio: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'consultation_fee' || name === 'years_of_experience' ? Number(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await doctorAPI.register(formData);
      if (result.id) {
        navigate('/doctor/login');
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
        <h1 className="text-2xl font-bold mb-6 text-center">Doctor Registration</h1>
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
              <label className="block text-gray-700 mb-2">Specialty</label>
              <input type="text" name="specialty" value={formData.specialty} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">License Number</label>
              <input type="text" name="license_number" value={formData.license_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Qualifications</label>
              <input type="text" name="qualifications" value={formData.qualifications} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Consultation Fee</label>
              <input type="number" name="consultation_fee" value={formData.consultation_fee} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Years of Experience</label>
              <input type="number" name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" rows="3" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          Already have an account? <a href="/doctor/login" className="text-blue-600">Login</a>
        </p>
      </div>
    </div>
  );
}