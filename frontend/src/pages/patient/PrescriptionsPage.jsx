import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { doctorAPI } from '../../api/doctor';
import { toast } from 'react-hot-toast';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const profile = await patientAPI.getProfile();
      if (profile?.id) {
        setPatientId(profile.id);
        const data = await doctorAPI.getPatientPrescriptions(profile.id);
        setPrescriptions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Prescriptions</h1>
          <p className="text-gray-500 mt-1">{prescriptions.length} total prescriptions</p>
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">💊</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">No prescriptions yet</h3>
          <p className="text-gray-500 mb-4">Prescriptions from your doctors will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((presc) => (
            <div key={presc.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">
                    💊
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Dr. {presc.doctor_name || `#${presc.doctor_id}`}</h3>
                    <p className="text-sm text-gray-500">{formatDate(presc.issued_at)}</p>
                  </div>
                </div>
                {presc.appointment_id && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">
                    From appointment
                  </span>
                )}
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Medication</p>
                  <p className="text-gray-900">{presc.medication_details}</p>
                </div>
                
                {presc.dosage && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Dosage</p>
                    <p className="text-gray-900">{presc.dosage}</p>
                  </div>
                )}
                
                {presc.duration && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Duration</p>
                    <p className="text-gray-900">{presc.duration}</p>
                  </div>
                )}
                
                {presc.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                    <p className="text-gray-600 text-sm">{presc.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
