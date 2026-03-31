import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI } from '../api/patient';

export default function Landing() {
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    const data = await patientAPI.getDoctors();
    setDoctors(Array.isArray(data) ? data : []);
  };

  const handleSearch = async () => {
    const data = await patientAPI.getDoctors(searchSpecialty);
    setDoctors(Array.isArray(data) ? data : []);
  };

  const handleDoctorClick = async (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setReason('');
    setSlotsByDate({});
    
    const availability = await patientAPI.getDoctorAvailability(doctor.id);
    const availArray = Array.isArray(availability) ? availability : [];
    setDoctorAvailability(availArray);
    
    loadAllSlots(doctor.id, availArray);
  };

  const loadAllSlots = async (doctorId, availability) => {
    setLoadingSlots(true);
    const slotsData = {};
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hasAvailability = availability.some(
        a => a.day_of_week.toLowerCase() === dayName.toLowerCase()
      );
      
      if (hasAvailability) {
        const slots = await patientAPI.getAvailableSlots(doctorId, dateStr);
        if (slots && slots.length > 0) {
          slotsData[dateStr] = {
            dayName,
            slots: slots
          };
        }
      }
    }
    
    setSlotsByDate(slotsData);
    setLoadingSlots(false);
  };

  const handleBookClick = () => {
    const token = localStorage.getItem('patient_token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }
    
    if (!selectedSlot) {
      alert('Please select a time slot');
      return;
    }
    
    handleConfirmBooking();
  };

  const handleConfirmBooking = async () => {
    const result = await patientAPI.createAppointment({
      doctor_id: selectedDoctor.id,
      appointment_date: selectedSlot.date,
      appointment_time: selectedSlot.time,
      reason_for_visit: reason,
    });

    if (result.id) {
      alert('Appointment booked successfully!');
      setSelectedDoctor(null);
      navigate('/patient/dashboard');
    } else {
      alert(result.detail || 'Failed to book appointment');
    }
  };

  const isLoggedIn = () => !!localStorage.getItem('patient_token');

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                HealthCare
              </span>
            </div>
            
            {/* Nav Links */}
            <div className="flex items-center gap-4">
              {isLoggedIn() ? (
                <a href="/patient/dashboard" className="text-gray-600 hover:text-blue-600 font-medium transition">
                  My Appointments
                </a>
              ) : (
                <>
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="text-gray-600 hover:text-blue-600 font-medium transition"
                  >
                    Sign In
                  </button>
                  <a 
                    href="/patient/register" 
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                  >
                    Get Started
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Find Your Doctor & Book Appointment
          </h1>
          <p className="text-blue-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Channel top specialists at leading hospitals. Quick, easy, and secure booking.
          </p>
          
          {/* Search Box */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col md:flex-row">
              <div className="flex-1 flex items-center px-4 py-3">
                <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by specialty, doctor name..."
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              <button 
                onClick={handleSearch} 
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg mt-2 md:mt-0 md:ml-2"
              >
                Search
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex justify-center gap-8 mt-12 text-blue-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{doctors.length}+</div>
              <div className="text-sm">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">5+</div>
              <div className="text-sm">Specialties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-sm">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctors List */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {searchSpecialty ? `Results for "${searchSpecialty}"` : 'Available Doctors'}
            </h2>
            <p className="text-gray-500 mt-1">{doctors.length} doctors ready to serve you</p>
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-gray-400 text-lg">No doctors found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {doctors.map((doctor) => (
              <div 
                key={doctor.id}
                onClick={() => handleDoctorClick(doctor)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer p-6 group"
              >
                <div className="flex items-center gap-6">
                  {/* Avatar */}
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-105 transition-transform">
                    👨‍⚕️
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {doctor.full_name}
                    </h3>
                    <p className="text-blue-600 font-medium">{doctor.specialty}</p>
                    <p className="text-gray-500 text-sm mt-1">{doctor.qualifications}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {doctor.years_of_experience} years
                      </span>
                      <span className="text-green-600 font-semibold">Rs. {doctor.consultation_fee}</span>
                    </div>
                  </div>
                  
                  {/* Button */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-full font-medium group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <span>Book Now</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: '✓', title: 'Verified Doctors', desc: 'All doctors verified' },
              { icon: '⚡', title: 'Instant Booking', desc: 'Book in seconds' },
              { icon: '🔒', title: 'Secure Payment', desc: '100% secure' },
              { icon: '💬', title: '24/7 Support', desc: 'Always available' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">
                  {item.icon}
                </div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2026 HealthCare. All rights reserved.</p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome Back</h2>
              <p className="text-gray-500 text-center mb-6">Sign in to continue</p>
              <div className="space-y-3">
                <a 
                  href="/patient/login" 
                  className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-blue-700 transition"
                >
                  Sign in as Patient
                </a>
                <a 
                  href="/doctor/login" 
                  className="block w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-center hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  Sign in as Doctor
                </a>
              </div>
              <p className="mt-6 text-center text-gray-500 text-sm">
                Don't have an account? <a href="/patient/register" className="text-blue-600 font-medium">Create one</a>
              </p>
            </div>
            <button 
              onClick={() => setShowLoginModal(false)} 
              className="w-full py-3 border-t border-gray-100 text-gray-500 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">
                    👨‍⚕️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedDoctor.full_name}</h3>
                    <p className="text-blue-100">{selectedDoctor.specialty}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDoctor(null)} 
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">{selectedDoctor.specialty}</span>
                <span className="text-blue-100">{selectedDoctor.years_of_experience} years experience</span>
                <span className="text-green-300 font-semibold">Rs. {selectedDoctor.consultation_fee}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Available Days */}
              {doctorAvailability.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-3">Available Days</p>
                  <div className="flex flex-wrap gap-2">
                    {doctorAvailability.map((av, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        {av.day_of_week}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Slots */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-3">Select a Time Slot</p>
                {loadingSlots ? (
                  <div className="py-8 text-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading available slots...
                  </div>
                ) : Object.keys(slotsByDate).length === 0 ? (
                  <div className="py-8 text-center text-red-500 bg-red-50 rounded-xl">
                    No available slots in the next 14 days
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(slotsByDate).map(([date, data]) => (
                      <div key={date} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="font-medium text-gray-700">
                            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {data.slots.map((slot, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSlot({ date, time: slot.time, ...slot })}
                              className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                selectedSlot?.date === date && selectedSlot?.time === slot.time
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Info */}
              {selectedSlot && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-blue-800 font-medium">
                    Selected: {new Date(selectedSlot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {selectedSlot.time}
                  </p>
                </div>
              )}

              {/* Reason */}
              {selectedSlot && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Reason for Visit</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe your symptoms or reason..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    rows="2"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleBookClick}
                  disabled={!selectedSlot}
                  className={`flex-1 py-3.5 rounded-xl font-semibold transition-all ${
                    selectedSlot
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {selectedSlot ? 'Confirm Booking' : 'Select a Slot'}
                </button>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="px-6 py-3.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}