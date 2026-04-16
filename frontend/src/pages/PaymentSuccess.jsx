import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('loading');
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
        
        const res = await fetch('http://localhost:8002/doctors/slots/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

        if (result.success) {
          sessionStorage.removeItem('pending_booking');
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Booking error:', err);
        setStatus('error');
      }
    }

    completeBooking();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center p-8">
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
            <p className="text-gray-600 mb-4">Your appointment has been confirmed.</p>
            <button 
              onClick={() => navigate('/patient/dashboard')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Go to Dashboard
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
            <p className="text-gray-600 mb-4">Your payment succeeded but booking failed. Contact support.</p>
            <button 
              onClick={() => navigate('/patient/dashboard')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'no-booking' && (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">No Pending Booking</h1>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Book Appointment
            </button>
          </>
        )}
      </div>
    </div>
  );
}