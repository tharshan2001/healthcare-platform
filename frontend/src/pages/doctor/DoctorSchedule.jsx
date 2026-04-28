import { useState, useEffect } from 'react';
import { doctorAPI } from '../../api/doctor';
import { toast } from 'react-hot-toast';

export default function DoctorSchedule() {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    is_available: true
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const data = await doctorAPI.getMyAvailability();
      setAvailability(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
    setLoading(false);
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      await doctorAPI.addAvailability(newSlot);
      toast.success('Schedule slot added');
      setShowForm(false);
      setNewSlot({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', is_available: true });
      loadAvailability();
    } catch (error) {
      toast.error('Failed to add slot');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (confirm('Are you sure you want to remove this schedule slot?')) {
      try {
        await doctorAPI.deleteAvailability(id);
        toast.success('Slot removed');
        loadAvailability();
      } catch (error) {
        toast.error('Failed to remove slot');
      }
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const groupedAvailability = days.map(day => ({
    day,
    slots: availability.filter(a => a.day_of_week === day)
  }));

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
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Manage your availability</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Slot'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Schedule Slot</h3>
          <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot({ ...newSlot, day_of_week: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Slot
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groupedAvailability.map(({ day, slots }) => (
          <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{day}</h3>
              <p className="text-sm text-gray-500">{slots.length} slot(s)</p>
            </div>
            <div className="p-4 space-y-2">
              {slots.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No slots available</p>
              ) : (
                slots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                    <div>
                      <p className="font-medium text-gray-900">{slot.start_time} - {slot.end_time}</p>
                      <span className={`text-xs ${slot.is_available ? 'text-green-600' : 'text-red-600'}`}>
                        {slot.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
