import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function completeBooking() {
      const bookingData = sessionStorage.getItem('pending_booking');
      
      if (!bookingData) {
        setStatus('no-booking');
        return;
      }

      try {
        const booking = JSON.parse(bookingData);
        
        const token = localStorage.getItem('patient_token');
        
        const res = await fetch(`${import.meta.env.VITE_DOCTOR_API || 'http://localhost:8002'}/doctors/slots/book`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            slot_id: booking.slot_id,
            patient_id: booking.patient_id,
            doctor_id: booking.doctor_id,
            date: booking.date,
            time: booking.time,
            reason: booking.reason || 'Appointment'
          })
        });

        const result = await res.json();
        console.log('Booking response:', result);

        if (result.success || result.id || res.ok) {
          sessionStorage.removeItem('pending_booking');
          toast.success('Appointment booked successfully!');
          setStatus('success');
        } else {
          setError(result.detail || result.message || 'Unknown error');
          setStatus('error');
        }
      } catch (err) {
        console.error('Booking error:', err);
        setError(err.message);
        setStatus('error');
      }
    }

    completeBooking();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center p-8 max-w-md">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-green-800">Processing...</h1>
            <p className="text-gray-600">Completing your booking</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-800 mb-2">Appointment Booked!</h1>
            <p className="text-gray-600 mb-6">Your appointment has been confirmed.</p>
            <button 
              onClick={() => navigate('/patient/appointments')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              View Appointments
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-800 mb-2">Booking Issue</h1>
            <p className="text-gray-600 mb-2">Your payment was processed successfully.</p>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => navigate('/patient/appointments')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                View Appointments
              </button>
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Book Again
              </button>
            </div>
          </>
        )}

        {status === 'no-booking' && (
          <>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Not Found</h1>
            <p className="text-gray-600 mb-6">No pending booking found. If you paid, please contact support.</p>
            <button 
              onClick={() => navigate('/patient/appointments')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              View Appointments
            </button>
          </>
        )}
      </div>
    </div>
  );
}
