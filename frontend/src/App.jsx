import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AIFloatingButton from './components/ai/AIFloatingButton';

import Landing from './pages/Landing';
import DoctorSearch from './pages/DoctorSearch';

import DoctorLogin from './pages/doctor/DoctorLogin';
import DoctorRegister from './pages/doctor/DoctorRegister';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorLayout from './layouts/DoctorLayout';

import PatientLogin from './pages/patient/PatientLogin';
import PatientRegister from './pages/patient/PatientRegister';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientAppointments from './pages/patient/AppointmentsPage';
import PatientRecords from './pages/patient/RecordsPage';
import PatientProfile from './pages/patient/ProfilePage';
import PatientLayout from './layouts/PatientLayout';

import SymptomChecker from './pages/patient/SymptomChecker';
import PaymentSuccess from './pages/PaymentSuccess';
import TelemedicineHub from './pages/telemedicine/TelemedicineHub';
import TelemedicineSession from './pages/telemedicine/TelemedicineSession';

function ProtectedPatientRoute() {
  const token = localStorage.getItem('patient_token');
  if (!token) {
    return <Navigate to="/patient/login" replace />;
  }
  return <Outlet />;
}

function ProtectedDoctorRoute() {
  const token = localStorage.getItem('doctor_token');
  if (!token) {
    return <Navigate to="/doctor/login" replace />;
  }
  return <Outlet />;
}

function PublicPatientRoute() {
  return <Outlet />;
}

function PublicDoctorRoute() {
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 20px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AIFloatingButton />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/doctor-search" element={<DoctorSearch />} />
        
        <Route element={<PublicDoctorRoute />}>
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />
        </Route>
        
        <Route element={<ProtectedDoctorRoute />}>
          <Route element={<DoctorLayout />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<div className="p-8">Appointments - Coming Soon</div>} />
            <Route path="/doctor/schedule" element={<div className="p-8">Schedule - Coming Soon</div>} />
            <Route path="/doctor/patients" element={<div className="p-8">Patients - Coming Soon</div>} />
            <Route path="/doctor/prescriptions" element={<div className="p-8">Prescriptions - Coming Soon</div>} />
            <Route path="/doctor/availability" element={<div className="p-8">Availability - Coming Soon</div>} />
            <Route path="/doctor/telemedicine" element={<div className="p-8">Telemedicine - Coming Soon</div>} />
            <Route path="/doctor/profile" element={<div className="p-8">Profile - Coming Soon</div>} />
          </Route>
        </Route>
        
        <Route element={<PublicPatientRoute />}>
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route path="/patient/register" element={<PatientRegister />} />
        </Route>
        
        <Route element={<ProtectedPatientRoute />}>
          <Route element={<PatientLayout />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/appointments" element={<PatientAppointments />} />
            <Route path="/patient/records" element={<PatientRecords />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
          </Route>
        </Route>
        
        <Route path="/telemedicine" element={<TelemedicineHub />} />
        <Route path="/telemedicine/sessions/:sessionId" element={<TelemedicineSession />} />
        
        <Route path="/payment/success" element={<PaymentSuccess />} />
        
        <Route path="/payment/cancel" element={
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-red-800 mb-2">Payment Cancelled</h1>
              <p className="text-gray-600 mb-4">Your payment was not completed.</p>
              <a href="/" className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Try Again</a>
            </div>
          </div>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;