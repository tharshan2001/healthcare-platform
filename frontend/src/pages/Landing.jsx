import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { patientAPI } from '../api/patient';
import PaymentModal from '../components/PaymentModal';

export default function Landing() {
  const [searchParams] = useSearchParams();
  const isLoggedIn = !!localStorage.getItem('patient_token');
  const [searchDoctorName, setSearchDoctorName] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [searchHospital, setSearchHospital] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [lockedSlotId, setLockedSlotId] = useState(null);
  const [reason, setReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const doctorId = searchParams.get('doctor');
    if (doctorId) {
      loadDoctorFromSearch(doctorId);
    }
  }, []);

  const loadDoctorFromSearch = async (doctorId) => {
    try {
      const doctor = await patientAPI.getDoctor(doctorId);
      if (doctor && doctor.id) {
        handleDoctorClick(doctor);
      }
    } catch (e) {
      console.error('Failed to load doctor:', e);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const [specs, hosps] = await Promise.all([
      patientAPI.getSpecializations(),
      patientAPI.getHospitals()
    ]);
    setSpecializations(Array.isArray(specs) ? specs : []);
    setHospitals(Array.isArray(hosps) ? hosps : []);
  };

  const handleSearch = async () => {
    if (!searchSpecialty && !searchHospital && !searchDoctorName && !searchDate) {
      navigate('/doctor-search');
      return;
    }
    
    const params = new URLSearchParams();
    if (searchDoctorName) params.append('doctor_name', searchDoctorName);
    if (searchSpecialty) params.append('specialty', searchSpecialty);
    if (searchHospital) params.append('hospital_name', searchHospital);
    if (searchDate) params.append('date', searchDate);
    
    navigate(`/doctor-search?${params.toString()}`);
  };

  const handleGoToSearch = () => {
    navigate('/doctor-search');
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

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
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

  const handleBookClick = async () => {
    const token = localStorage.getItem('patient_token');
    if (!token) {
      setShowLoginModal(true);
      toast.error('Please login to book an appointment');
      return;
    }
    
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }
    
    const slotId = selectedSlot?.id;
    if (!slotId) {
      toast.error('Invalid slot. Please select again.');
      return;
    }
    
    const patientId = parseInt(localStorage.getItem('patient_id') || '1');
    
    toast.loading('Locking slot...', { id: 'booking' });
    
    try {
      const lockResult = await patientAPI.lockSlot(slotId, patientId);
      
      if (lockResult.success) {
        setLockedSlotId(slotId);
        setShowPaymentModal(true);
        toast.dismiss('booking');
      } else {
        toast.error(lockResult.message || 'Failed to lock slot', { id: 'booking' });
      }
    } catch (err) {
      console.error('Lock error:', err);
      toast.error(err.message || err.detail || 'Please login to book', { id: 'booking' });
    }
  };

  const handlePaymentSuccess = async () => {
    if (!lockedSlotId || !selectedDoctor || !selectedSlot) return;
    
    try {
      const result = await patientAPI.bookSlot(
        lockedSlotId,
        parseInt(localStorage.getItem('patient_id') || '1'),
        selectedDoctor.id,
        selectedSlot.date,
        selectedSlot.time,
        reason
      );

      if (result.success) {
        toast.success('Appointment booked successfully!');
        setShowPaymentModal(false);
        setSelectedDoctor(null);
        setSelectedSlot(null);
        setReason('');
        setLockedSlotId(null);
        setTimeout(() => navigate('/patient/appointments'), 1500);
      } else {
        toast.error(result.detail || 'Failed to book appointment. Please contact support.');
        handlePaymentFailure();
      }
    } catch (err) {
      toast.error(err.message || err.detail || 'Please login to book');
      handlePaymentFailure();
    }
  };

  const handlePaymentFailure = async () => {
    if (lockedSlotId) {
      try {
        await patientAPI.releaseSlot(
          lockedSlotId, 
          parseInt(localStorage.getItem('patient_id') || '1')
        );
      } catch (e) {}
    }
    setShowPaymentModal(false);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setReason('');
    setLockedSlotId(null);
  };

  const features = [
    {
      title: 'Find Doctors',
      desc: 'Search specialists by name, specialty, or hospital',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      title: 'Book Appointments',
      desc: 'Schedule consultations with available time slots',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Video Consultation',
      desc: 'Connect with doctors from the comfort of your home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'AI Symptom Checker',
      desc: 'Get preliminary health insights powered by AI',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  const steps = [
    { num: '1', title: 'Search Doctor', desc: 'Find specialists by specialty, location, or availability' },
    { num: '2', title: 'Select Time Slot', desc: 'Choose from available slots that fit your schedule' },
    { num: '3', title: 'Make Payment', desc: 'Secure payment via Stripe or other methods' },
    { num: '4', title: 'Get Consultation', desc: 'Visit in-person or connect via video call' },
  ];

  const specialties = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist',
    'Orthopedic', 'Pediatrician', 'Psychiatrist', 'Gynecologist'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#e5e7eb' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#146ef5' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xl font-bold" style={{ color: '#080808' }}>HealthCare</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="font-medium" style={{ color: '#363636' }}>Features</a>
              <a href="#how-it-works" className="font-medium" style={{ color: '#363636' }}>How it Works</a>
              <a href="#specialties" className="font-medium" style={{ color: '#363636' }}>Specialties</a>
            </nav>
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <a href="/patient/dashboard" className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: '#146ef5' }}>Dashboard</a>
              ) : (
                <>
                  <a href="/patient/login" className="px-4 py-2 font-medium" style={{ color: '#363636' }}>Patient Login</a>
                  <a href="/doctor/login" className="px-4 py-2 font-medium" style={{ color: '#363636' }}>Doctor Login</a>
                  <a href="/patient/register" className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: '#146ef5' }}>Get Started</a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative" style={{ backgroundColor: '#146ef5' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Your Health,<br className="hidden md:block" /> Your Schedule
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Book appointments with top doctors, consult via video call, and manage your healthcare journey.
          </p>
            
          <div className="bg-white rounded-2xl p-2 shadow-2xl max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <select
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: '#f9fafb', color: '#080808' }}
                >
                  <option value="">Select Specialty</option>
                  {specializations.length > 0 ? (
                    specializations.map(s => <option key={s} value={s}>{s}</option>)
                  ) : (
                    specialties.map(s => <option key={s} value={s}>{s}</option>)
                  )}
                </select>
              </div>
              <button
                onClick={handleSearch}
                className="px-8 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: '#146ef5' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Doctors
              </button>
            </div>
          </div>

          <div className="flex justify-center gap-8 md:gap-16 mt-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">50+</div>
              <div className="text-blue-200 text-sm">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">10+</div>
              <div className="text-blue-200 text-sm">Specialties</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">24/7</div>
              <div className="text-blue-200 text-sm">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#080808' }}>Everything You Need</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Complete healthcare management at your fingertips</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#dbeafe' }}>
                  <span style={{ color: '#146ef5' }}>{feature.icon}</span>
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#080808' }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: '#6b7280' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#080808' }}>How It Works</h2>
            <p className="text-gray-600">Book your appointment in 4 simple steps</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4" style={{ backgroundColor: '#146ef5' }}>
                  {step.num}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#080808' }}>{step.title}</h3>
                <p className="text-sm" style={{ color: '#6b7280' }}>{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5" style={{ backgroundColor: '#bfdbfe' }}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section id="specialties" className="py-20" style={{ backgroundColor: '#146ef5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">Medical Specialties</h2>
            <p className="text-blue-100">Find the right specialist for your needs</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {specialties.map((specialty, i) => (
              <a
                key={i}
                href={`/doctor-search?specialty=${encodeURIComponent(specialty)}`}
                className="px-5 py-2 rounded-full text-white transition"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                {specialty}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#080808' }}>Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of patients who have simplified their healthcare journey with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/patient/register" className="px-8 py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: '#146ef5' }}>
              Create Account
            </a>
            <a href="/doctor-search" className="px-8 py-3 rounded-xl font-semibold border-2" style={{ borderColor: '#d1d5db', color: '#363636' }}>
              Browse Doctors
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#111827' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#146ef5' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-white font-semibold">HealthCare</span>
              </div>
              <p className="text-gray-400 text-sm">Your trusted healthcare platform for booking appointments and managing your health journey.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Patients</h4>
              <ul className="space-y-2">
                <li><a href="/patient/register" className="text-gray-400 hover:text-white text-sm transition">Register</a></li>
                <li><a href="/patient/login" className="text-gray-400 hover:text-white text-sm transition">Login</a></li>
                <li><a href="/doctor-search" className="text-gray-400 hover:text-white text-sm transition">Find Doctors</a></li>
                <li><a href="/patient/dashboard" className="text-gray-400 hover:text-white text-sm transition">My Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Doctors</h4>
              <ul className="space-y-2">
                <li><a href="/doctor/login" className="text-gray-400 hover:text-white text-sm transition">Doctor Login</a></li>
                <li><a href="/doctor/dashboard" className="text-gray-400 hover:text-white text-sm transition">Doctor Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/telemedicine" className="text-gray-400 hover:text-white text-sm transition">Telemedicine</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white text-sm transition">Features</a></li>
                <li><a href="#specialties" className="text-gray-400 hover:text-white text-sm transition">Specialties</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">© 2026 HealthCare Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(8,8,8,0.5)' }}>
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#080808' }}>Welcome Back</h2>
              <p className="text-center mb-6" style={{ color: '#6b7280' }}>Sign in to continue</p>
              <div className="space-y-3">
                <a href="/patient/login" className="block w-full text-center py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: '#146ef5' }}>
                  Sign in as Patient
                </a>
                <a href="/doctor/login" className="block w-full text-center py-3 rounded-xl font-semibold border-2" style={{ borderColor: '#e5e7eb', color: '#363636' }}>
                  Sign in as Doctor
                </a>
              </div>
              <p className="mt-6 text-center text-sm" style={{ color: '#6b7280' }}>
                Don't have an account? <a href="/patient/register" className="font-medium" style={{ color: '#146ef5' }}>Create one</a>
              </p>
            </div>
            <button onClick={() => setShowLoginModal(false)} className="w-full py-3 border-t text-center" style={{ borderColor: '#f3f4f6', color: '#6b7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Doctor Detail / Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(8,8,8,0.5)' }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold" style={{ color: '#080808' }}>Book Appointment</h2>
                <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: '#dbeafe', color: '#146ef5' }}>
                  {selectedDoctor.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#080808' }}>{selectedDoctor.full_name}</h3>
                  <p className="font-medium" style={{ color: '#146ef5' }}>{selectedDoctor.specialty}</p>
                  <p className="text-sm" style={{ color: '#6b7280' }}>{selectedDoctor.qualifications}</p>
                </div>
              </div>
              
              <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                <div className="flex justify-between items-center">
                  <span className="font-medium" style={{ color: '#363636' }}>Consultation Fee</span>
                  <span className="text-xl font-bold" style={{ color: '#10b981' }}>Rs. {selectedDoctor.consultation_fee}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block font-medium mb-2" style={{ color: '#363636' }}>Select Date & Time</label>
                {loadingSlots ? (
                  <p className="text-center py-4" style={{ color: '#6b7280' }}>Loading available slots...</p>
                ) : Object.keys(slotsByDate).length === 0 ? (
                  <p className="text-center py-4" style={{ color: '#6b7280' }}>No available slots in the next 14 days</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {Object.entries(slotsByDate).map(([date, data]) => (
                      <div key={date}>
                        <p className="font-medium text-sm mb-1" style={{ color: '#363636' }}>{data.dayName} - {date}</p>
                        <div className="flex flex-wrap gap-2">
                          {data.slots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                selectedSlot?.id === slot.id 
                                  ? 'text-white' 
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              style={selectedSlot?.id === slot.id ? { backgroundColor: '#146ef5' } : {}}
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

              <div className="mb-6">
                <label className="block font-medium mb-2" style={{ color: '#363636' }}>Reason for Visit (Optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Annual checkup, headache..."
                  className="w-full px-4 py-2 rounded-lg border outline-none"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>

              <button
                onClick={handleBookClick}
                disabled={!selectedSlot}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#146ef5' }}
              >
                {selectedSlot ? `Book for ${selectedSlot.date} at ${selectedSlot.time}` : 'Select a time slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        doctor={selectedDoctor}
        slot={selectedSlot}
        patientId={parseInt(localStorage.getItem('patient_id') || '0')}
        lockedSlotId={lockedSlotId}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
    </div>
  );
}
