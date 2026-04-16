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
import PatientLayout from './layouts/PatientLayout';

import SymptomChecker from './pages/patient/SymptomChecker';
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
  const token = localStorage.getItem('patient_token');
  if (token) {
    return <Navigate to="/patient/dashboard" replace />;
  }
  return <Outlet />;
}

function PublicDoctorRoute() {
  const token = localStorage.getItem('doctor_token');
  if (token) {
    return <Navigate to="/doctor/dashboard" replace />;
  }
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
            <Route path="/patient/doctors" element={<div className="p-8">Find Doctors - Coming Soon</div>} />
            <Route path="/patient/appointments" element={<div className="p-8">Appointments - Coming Soon</div>} />
            <Route path="/patient/records" element={<div className="p-8">Medical Records - Coming Soon</div>} />
            <Route path="/patient/telemedicine" element={<div className="p-8">Telemedicine - Coming Soon</div>} />
            <Route path="/patient/symptoms" element={<SymptomChecker />} />
            <Route path="/patient/profile" element={<div className="p-8">Profile - Coming Soon</div>} />
          </Route>
        </Route>
        
        <Route path="/telemedicine" element={<TelemedicineHub />} />
        <Route path="/telemedicine/sessions/:sessionId" element={<TelemedicineSession />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;