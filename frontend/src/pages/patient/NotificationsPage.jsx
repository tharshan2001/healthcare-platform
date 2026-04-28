import { useState, useEffect } from 'react';
import { patientAPI } from '../../api/patient';
import { toast } from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await patientAPI.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    }
    setLoading(false);
  };

  const handleMarkRead = async (id) => {
    try {
      await patientAPI.markNotificationRead(id);
      loadNotifications();
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <span className="text-sm text-gray-500">{notifications.length} total</span>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">No notifications</h3>
          <p className="text-gray-500">Notifications will appear here when you have updates</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-sm transition ${
                notif.status === 'unread' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      notif.status === 'unread' ? 'bg-blue-600' : 'bg-gray-300'
                    }`}></span>
                    <span className="text-xs font-medium text-gray-500 uppercase">{notif.type}</span>
                    {notif.status === 'unread' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(notif.created_at)}</p>
                </div>
                {notif.status === 'unread' && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
