import { useState } from 'react';
import { patientAPI } from '../../api/patient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function PatientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await patientAPI.login({ email, password });
      if (result.access_token) {
        const profile = await patientAPI.getProfile();
        if (profile?.id) {
          localStorage.setItem('patient_id', profile.id);
        }
        toast.success('Welcome back!');
        navigate('/patient/dashboard');
      } else {
        toast.error(result.detail || 'Invalid credentials');
      }
    } catch (err) {
      toast.error('Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="bg-white p-8 rounded-xl w-full max-w-md" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.04) 0px 30px 18px' }}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#146ef5' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#080808' }}>Welcome Back</h1>
          <p className="mt-1" style={{ color: '#5a5a5a' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#363636' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border outline-none"
              style={{ borderColor: '#e5e7eb' }}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#363636' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border outline-none"
              style={{ borderColor: '#e5e7eb' }}
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#146ef5' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: '#5a5a5a' }}>
          Don't have an account?{' '}
          <a href="/patient/register" className="font-medium" style={{ color: '#146ef5' }}>
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
