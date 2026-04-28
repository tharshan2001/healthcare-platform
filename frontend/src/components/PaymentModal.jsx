import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  doctor, 
  slot, 
  patientId,
  onSuccess, 
  onFailure,
  lockedSlotId
}) {
  const [processing, setProcessing] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardData, setCardData] = useState({
    number: '4242424242424242',
    expiry: '12/28',
    cvc: '123',
    name: 'Test User'
  });

  if (!isOpen || !doctor || !slot) return null;

  const handlePayment = async () => {
    const token = localStorage.getItem('patient_token');
    if (!token || !patientId) {
      toast.error('Please login to book an appointment');
      window.location.href = '/patient/login';
      return;
    }

    if (!showCardForm) {
      setShowCardForm(true);
      return;
    }

    setProcessing(true);
    toast.loading('Processing payment...', { id: 'pay' });

      try {
        const PAYMENT_API = import.meta.env.VITE_PAYMENT_API || 'http://localhost:8005';
        const res = await fetch(`${PAYMENT_API}/payments/create`, {
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
        }, { signal: AbortSignal.timeout(30000) });

      if (!res.ok) {
        const errorText = await res.text();
        toast.error(`Payment failed: ${res.status}`, { id: 'pay' });
        setProcessing(false);
        return;
      }

      const data = await res.json();

      if (data.checkout_url) {
        sessionStorage.setItem('pending_booking', JSON.stringify({
          slot_id: slot.id,
          patient_id: patientId,
          doctor_id: doctor.id,
          date: slot.date,
          time: slot.time,
          reason: 'Appointment'
        }));
        
        toast.dismiss('pay');
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

  const handleClose = async () => {
    if (processing) return;
    
    if (lockedSlotId && patientId) {
      const token = localStorage.getItem('patient_token');
      try {
        await fetch(`${import.meta.env.VITE_DOCTOR_API || 'http://localhost:8002'}/doctors/slots/release`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ slot_id: lockedSlotId, patient_id: patientId })
        });
      } catch (e) {
        console.error('Failed to release slot:', e);
      }
    }
    
    setShowCardForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">
            {showCardForm ? 'Card Details' : 'Payment'}
          </h3>
          <button onClick={handleClose} disabled={processing} className="opacity-70 hover:opacity-100">✕</button>
        </div>

        <div className="p-6">
          {!showCardForm ? (
            <>
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
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex justify-center items-center gap-2"
              >
                Continue to Payment
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Test Mode:</span> Use card number 4242 4242 4242 4242
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) => setCardData({...cardData, number: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                    <input
                      type="text"
                      value={cardData.cvc}
                      onChange={(e) => setCardData({...cardData, cvc: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => setCardData({...cardData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCardForm(false)}
                  className="flex-1 py-3 rounded-lg font-medium border border-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
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
              </div>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Your payment is secure and encrypted</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
