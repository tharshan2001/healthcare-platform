import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  doctor, 
  slot, 
  onSuccess, 
  onFailure,
  onReleaseSlot,
  processing: externalProcessing,
  setProcessing: externalSetProcessing
}) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [internalProcessing, setInternalProcessing] = useState(false);
  const processing = externalProcessing ?? internalProcessing;
  const setProcessing = externalSetProcessing ?? setInternalProcessing;
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  if (!isOpen || !doctor || !slot) return null;

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv || !name) {
      toast.error('Please fill all payment details');
      return;
    }

    setProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.1;
      
      if (success) {
        toast.success('Payment successful!');
        onSuccess();
      } else {
        toast.error('Payment failed. Please try again.');
        if (onReleaseSlot) {
          onReleaseSlot();
        }
        if (onFailure) {
          onFailure();
        }
        setProcessing(false);
        onClose();
      }
    } catch (error) {
      toast.error('Payment error');
      if (onReleaseSlot) {
        onReleaseSlot();
      }
      if (onFailure) {
        onFailure();
      }
      setProcessing(false);
      onClose();
    }
  };

  const handleClose = () => {
    if (!processing) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Payment</h3>
            <button 
              onClick={handleClose}
              disabled={processing}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{doctor.full_name}</p>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">Rs. {doctor.consultation_fee}</p>
                <p className="text-xs text-gray-500">
                  {slot.date} at {slot.time}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="JOHN DOE"
                disabled={processing}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                  setCardNumber(val.replace(/(\d{4})/g, '$1 ').trim());
                }}
                placeholder="1234 5678 9012 3456"
                disabled={processing}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                    setExpiry(val);
                  }}
                  placeholder="MM/YY"
                  disabled={processing}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  disabled={processing}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full mt-6 bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                Pay Rs. {doctor.consultation_fee}
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment via Stripe
          </div>
        </div>
      </div>
    </div>
  );
}