
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { telemedicineAPI } from '../../api/telemedicine';
import TelemedicineJoinModal from '../../components/telemedicine/TelemedicineJoinModal';
import TelemedicineStatusBadge from '../../components/telemedicine/TelemedicineStatusBadge';

const getCurrentRole = () => {
  if (localStorage.getItem('doctor_token')) return 'doctor';
  if (localStorage.getItem('patient_token')) return 'patient';
  return 'patient';
};

const getParticipantId = (role) => localStorage.getItem(role === 'doctor' ? 'doctor_id' : 'patient_id') || '';
const getDisplayName = (role) => {
  const keys = role === 'doctor'
    ? ['doctor_name', 'doctor_full_name', 'doctor_email']
    : ['patient_name', 'patient_full_name', 'patient_email'];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  const id = getParticipantId(role);
  return role === 'doctor' ? `Doctor ${id || ''}`.trim() : `Patient ${id || ''}`.trim();
};

export default function TelemedicineSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const role = useMemo(() => getCurrentRole(), []);
  const participantId = useMemo(() => getParticipantId(role), [role]);
  const displayName = useMemo(() => getDisplayName(role), [role]);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await telemedicineAPI.getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err?.message || 'Unable to load session');
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    const data = await telemedicineAPI.getSession(sessionId);
    setSession(data);
  };

  const openJoinLink = (joinUrl) => {
    if (!joinUrl) return;
    if (/^https?:\/\//i.test(joinUrl)) {
      globalThis.open(joinUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    toast('This provider uses a custom join link. Copy the URL or token from the join dialog.', {
      icon: 'ℹ️',
    });
  };

  const handleJoin = async ({ session: currentSession, role: joinRole, participantId: joinParticipantId, displayName: joinDisplayName }) => {
    const result = await telemedicineAPI.joinSession(currentSession.id, {
      role: joinRole,
      participant_id: joinParticipantId,
      display_name: joinDisplayName,
    });
    if (result?.join_url) {
      openJoinLink(result.join_url);
    }
    await refreshSession();
    return result;
  };

  const handleStart = async () => {
    await telemedicineAPI.startSession(session.id, { actor_role: role, actor_id: participantId || null });
    toast.success('Session started');
    await refreshSession();
  };

  const handleComplete = async () => {
    await telemedicineAPI.completeSession(session.id, { actor_role: role, actor_id: participantId || null });
    toast.success('Session completed');
    await refreshSession();
  };

  const handleCancel = async () => {
    const reason = globalThis.prompt('Enter a cancellation reason');
    if (!reason) return;
    await telemedicineAPI.cancelSession(session.id, { reason, actor_role: role, actor_id: participantId || null });
    toast.success('Session cancelled');
    await refreshSession();
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-600">Loading session…</p>
        </div>
      );
    }

    if (error) {
      return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>;
    }

    if (!session) {
      return null;
    }

    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Session overview</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">{session.room_name}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {session.scheduled_start_at ? new Date(session.scheduled_start_at).toLocaleString() : '—'} → {session.scheduled_end_at ? new Date(session.scheduled_end_at).toLocaleString() : '—'}
              </p>
            </div>
            <TelemedicineStatusBadge status={session.status} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Provider</p>
              <p className="mt-1 text-sm text-slate-600">{session.provider}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Room name</p>
              <p className="mt-1 break-all text-sm text-slate-600">{session.room_name}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Doctor</p>
              <p className="mt-1 break-all text-sm text-slate-600">{session.doctor_id}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Patient</p>
              <p className="mt-1 break-all text-sm text-slate-600">{session.patient_id}</p>
            </div>
          </div>

          {session.cancel_reason && (
            <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">
              <span className="font-semibold">Cancellation reason:</span> {session.cancel_reason}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setShowJoinModal(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Join session
            </button>
            {role === 'doctor' && session.status === 'scheduled' && (
              <button type="button" onClick={handleStart} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                Start session
              </button>
            )}
            {role === 'doctor' && session.status === 'live' && (
              <button type="button" onClick={handleComplete} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Complete session
              </button>
            )}
            {role === 'doctor' && session.status !== 'completed' && session.status !== 'cancelled' && (
              <button type="button" onClick={handleCancel} className="rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Cancel session
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Join links</p>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Doctor link</p>
                <p className="mt-1 break-all text-slate-600">{session.join_link_doctor || 'Not available yet'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Patient link</p>
                <p className="mt-1 break-all text-slate-600">{session.join_link_patient || 'Not available yet'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Event history</p>
            <div className="mt-4 space-y-3">
              {session.events?.length ? (
                session.events.map((event, index) => (
                  <div key={`${event.event_type}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{event.event_type}</p>
                    <p className="mt-1">{event.created_at ? new Date(event.created_at).toLocaleString() : '—'}</p>
                    {event.payload && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-600">{JSON.stringify(event.payload, null, 2)}</pre>}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No events yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('/telemedicine')} className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Telemedicine</p>
            <h1 className="text-2xl font-bold">Session Detail</h1>
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/telemedicine')} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to hub
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {renderBody()}
      </main>

      <TelemedicineJoinModal
        isOpen={showJoinModal && Boolean(session)}
        session={session}
        defaultRole={role}
        defaultParticipantId={participantId}
        defaultDisplayName={displayName}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoin}
      />
    </div>
  );
}


