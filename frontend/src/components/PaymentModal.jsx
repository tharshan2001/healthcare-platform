import { useState } from 'react';
import { toast } from 'react-hot-toast';

const patientAPI = {
  lockSlot: async (slotId, patientId) => {
    const res = await fetch('http://localhost:8002/doctors/slots/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slotId, patient_id: patientId })
    });
    return res.json();
  },
  bookSlot: async (slotId, patientId, doctorId, date, time, reason) => {
    const res = await fetch('http://localhost:8002/doctors/slots/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slotId, patient_id: patientId, doctor_id: doctorId, date, time, reason })
    });
    return res.json();
  }
};

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  doctor, 
  slot, 
  patientId,
  onSuccess, 
  onFailure,
  onReleaseSlot
}) {
  const [processing, setProcessing] = useState(false);

  if (!isOpen || !doctor || !slot) return null;

  const handlePayment = async () => {
    if (!patientId) {
      toast.error('Please login first');
      return;
    }

    setProcessing(true);
    toast.loading('Creating payment...', { id: 'pay' });

    try {
      // Step 1: Create Stripe checkout session
      const res = await fetch('/api/payment/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: slot.id || Math.floor(Date.now()/1000),
          patient_id: patientId,
          amount: doctor.consultation_fee || 5000,
          currency: 'LKR',
          payment_method: 'card',
          patient_email: 'aptharshan@gmail.com',
          patient_phone: '0705710466'
        })
      });

      const data = await res.json();
      
      if (data.checkout_url) {
        // Store booking info for success page
        sessionStorage.setItem('pending_booking', JSON.stringify({
          slot_id: slot.id,
          patient_id: patientId,
          doctor_id: doctor.id,
          date: slot.date,
          time: slot.time,
          reason: 'Appointment'
        }));
        
        // Step 2: Redirect to Stripe
        window.location.href = data.checkout_url;
        onClose();
      } else {
        throw new Error(data.detail || 'Payment failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Payment failed: ' + err.message, { id: 'pay' });
      if (onFailure) onFailure();
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">Payment</h3>
          <button onClick={handleClose} disabled={processing} className="opacity-70 hover:opacity-100">✕</button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">{doctor?.full_name}</p>
                <p className="text-sm text-gray-500">{doctor?.specialty}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">Rs. {doctor?.consultation_fee || 5000}</p>
                <p className="text-xs text-gray-400">{slot?.date} {slot?.time}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="font-medium text-yellow-800">Secure Payment via Stripe</p>
            <p className="text-sm text-yellow-600">You'll enter card details on Stripe's secure page</p>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Consultation Fee</span>
              <span>Rs. {doctor?.consultation_fee || 5000}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>Rs. {doctor?.consultation_fee || 5000}</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {processing ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </>
            ) : (
              <>Pay Rs. {doctor?.consultation_fee || 5000}</>
            )}
          </button>

          <p className="text-center text-gray-400 text-xs mt-3">
            🔒 Use test card: 4242 4242 4242 4242
          </p>
        </div>
      </div>
    </div>
  );
}