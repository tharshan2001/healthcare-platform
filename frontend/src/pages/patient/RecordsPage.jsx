import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { toast } from 'react-hot-toast';

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await patientAPI.getRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading records:', error);
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    const type = e.target.record_type.value;
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const result = await patientAPI.uploadRecord(file, type);
      if (result.id || result.success) {
        toast.success('Record uploaded successfully');
        loadRecords();
        e.target.reset();
      } else {
        toast.error(result.detail || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const getRecordIcon = (type) => {
    switch (type) {
      case 'report': return '📋';
      case 'prescription': return '💊';
      case 'lab': return '🧪';
      case 'imaging': return '🩻';
      default: return '📄';
    }
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
    return <div className="p-8 text-center">Loading records...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#080808' }}>Medical Records</h1>
      </div>

      <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 className="font-semibold mb-4" style={{ color: '#080808' }}>Upload New Record</h3>
        <form onSubmit={handleUpload}>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="file" 
                name="file"
                className="w-full px-4 py-2 rounded-lg border"
                style={{ borderColor: '#e5e7eb' }}
                required
              />
            </div>
            <div className="w-40">
              <select 
                name="record_type" 
                className="w-full px-4 py-2 rounded-lg border"
                style={{ borderColor: '#e5e7eb' }}
              >
                <option value="report">Report</option>
                <option value="prescription">Prescription</option>
                <option value="lab">Lab Results</option>
                <option value="imaging">Imaging</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={uploading}
              className="px-6 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: uploading ? '#9ca3af' : '#146ef5' }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="text-5xl">📋</span>
          <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: '#080808' }}>No records yet</h3>
          <p className="text-sm" style={{ color: '#5a5a5a' }}>Upload your medical records to keep them organized</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="font-medium" style={{ color: '#363636' }}>{records.length} Records</p>
          </div>
          <div className="divide-y" style={{ borderColor: '#e5e7eb' }}>
            {records.map((record) => (
              <div key={record.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getRecordIcon(record.record_type)}</span>
                  <div>
                    <p className="font-medium" style={{ color: '#080808' }}>{record.file_name}</p>
                    <p className="text-sm capitalize" style={{ color: '#5a5a5a' }}>{record.record_type}</p>
                  </div>
                </div>
                <span className="text-sm" style={{ color: '#5a5a5a' }}>
                  {formatDate(record.uploaded_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
