import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await patientAPI.getProfile();
      if (data?.id) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await patientAPI.updateProfile(formData);
      if (result.id) {
        setProfile(result);
        setEditMode(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.detail || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Common input classes for consistency
  const inputStyles = "mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all duration-200 bg-white";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-2xl overflow-hidden">
        {/* Header Section */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900">Profile Settings</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">Manage your personal information.</p>
          </div>
          
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    full_name: profile.full_name || '',
                    email: profile.email || '',
                    phone: profile.phone || '',
                    date_of_birth: profile.date_of_birth || '',
                    gender: profile.gender || '',
                    address: profile.address || ''
                  });
                }}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-6">
          {/* Avatar & Basic Info */}
          <div className="flex items-center gap-5 pb-8 mb-8 border-b border-gray-100">
            <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-sm ring-4 ring-blue-50">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-gray-900">
                {profile?.full_name || 'Anonymous User'}
              </h3>
              <p className="text-sm font-medium text-gray-500 mt-1">{profile?.email}</p>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={inputStyles}
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700">{profile?.full_name || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Email Address</label>
              <p className="mt-2 text-sm text-gray-700">{profile?.email || 'Not provided'}</p>
              {editMode && <p className="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Phone Number</label>
              {editMode ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputStyles}
                  placeholder="+1 (555) 000-0000"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700">{profile?.phone || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Date of Birth</label>
              {editMode ? (
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className={inputStyles}
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700">{profile?.date_of_birth || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Gender</label>
              {editMode ? (
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className={inputStyles}
                >
                  <option value="" disabled>Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              ) : (
                <p className="mt-2 text-sm text-gray-700 capitalize">
                  {profile?.gender?.replace(/_/g, ' ') || 'Not provided'}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium leading-6 text-gray-900">Address</label>
              {editMode ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className={`${inputStyles} resize-none`}
                  placeholder="Street address, City, State, ZIP"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {profile?.address || 'Not provided'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}