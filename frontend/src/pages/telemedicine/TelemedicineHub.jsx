
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { telemedicineAPI } from '../../api/telemedicine';
import TelemedicineSessionCard from '../../components/telemedicine/TelemedicineSessionCard';
import TelemedicineSessionForm from '../../components/telemedicine/TelemedicineSessionForm';
import TelemedicineJoinModal from '../../components/telemedicine/TelemedicineJoinModal';
import TelemedicineStatusBadge from '../../components/telemedicine/TelemedicineStatusBadge';

const STATUS_OPTIONS = ['', 'scheduled', 'live', 'completed', 'cancelled'];

const getStoredRole = (queryRole) => {
  if (queryRole === 'doctor' || queryRole === 'patient') return queryRole;
  if (localStorage.getItem('doctor_token')) return 'doctor';
  if (localStorage.getItem('patient_token')) return 'patient';
  return 'patient';
};

const getParticipantId = (role) => localStorage.getItem(role === 'doctor' ? 'doctor_id' : 'patient_id') || '';

const getDisplayName = (role) => {
  const candidateKeys = role === 'doctor'
    ? ['doctor_name', 'doctor_full_name', 'doctor_email']
    : ['patient_name', 'patient_full_name', 'patient_email'];

  for (const key of candidateKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  const participantId = getParticipantId(role);
  return role === 'doctor' ? `Doctor ${participantId || ''}`.trim() : `Patient ${participantId || ''}`.trim();
};

export default function TelemedicineHub() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(getStoredRole(searchParams.get('role')));
  const [statusFilter, setStatusFilter] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [joinSession, setJoinSession] = useState(null);

  const participantId = useMemo(() => getParticipantId(role), [role]);
  const displayName = useMemo(() => getDisplayName(role), [role]);

  const appointmentPrefill = useMemo(() => {
    const source = searchParams.get('source');
    if (source !== 'appointment') {
      return null;
    }

    const doctorId = searchParams.get('doctorId') || '';
    const patientId = searchParams.get('patientId') || '';
    const appointmentId = searchParams.get('appointmentId') || '';
    const startAt = searchParams.get('startAt') || '';
    const endAt = searchParams.get('endAt') || '';
    const durationMin = Number.parseInt(searchParams.get('durationMin') || '30', 10);

    let computedEndAt = endAt;
    if (!computedEndAt && startAt) {
      const startDate = new Date(startAt);
      if (!Number.isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
        computedEndAt = endDate.toISOString();
      }
    }

    return {
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      scheduled_start_at: startAt,
      scheduled_end_at: computedEndAt,
    };
  }, [searchParams]);

  const doctorSessionDefaultValues = useMemo(
    () => ({
      appointment_id: appointmentPrefill?.appointment_id || '',
      doctor_id: appointmentPrefill?.doctor_id || participantId,
      patient_id: appointmentPrefill?.patient_id || '',
      scheduled_start_at: appointmentPrefill?.scheduled_start_at || '',
      scheduled_end_at: appointmentPrefill?.scheduled_end_at || '',
      provider: 'jitsi',
    }),
    [appointmentPrefill, participantId],
  );

  useEffect(() => {
    setRole(getStoredRole(searchParams.get('role')));
  }, [searchParams]);

  useEffect(() => {
    loadSessions();
  }, [role, statusFilter]);

  const loadSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const filters = {
        status: statusFilter,
      };

      const storedParticipantId = getParticipantId(role);
      if (storedParticipantId) {
        filters[`${role}_id`] = storedParticipantId;
      }

      const response = await telemedicineAPI.listSessions(filters);
      setSessions(Array.isArray(response?.items) ? response.items : []);
    } catch (err) {
      setError(err?.message || 'Unable to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrent = async () => {
    await loadSessions();
    if (selectedSession) {
      const refreshed = await telemedicineAPI.getSession(selectedSession.id);
      setSelectedSession(refreshed);
    }
  };

  const handleCreateSession = async (payload) => {
    setSubmitting(true);
    try {
      const result = await telemedicineAPI.createSession(payload);
      toast.success('Telemedicine session created');
      await loadSessions();
      if (result?.session_id) {
        navigate(`/telemedicine/sessions/${result.session_id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openJoinLink = (joinUrl) => {
    if (!joinUrl) return;
    if (/^https?:\/\//i.test(joinUrl)) {
      globalThis.open(joinUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    toast('This session uses a provider-specific join link. Copy the link or token from the join dialog.', {
      icon: 'ℹ️',
    });
  };

  const handleStartSession = async (session) => {
    await telemedicineAPI.startSession(session.id, {
      actor_role: 'doctor',
      actor_id: participantId || null,
    });
    toast.success('Session started');
    await refreshCurrent();
  };

  const handleCompleteSession = async (session) => {
    await telemedicineAPI.completeSession(session.id, {
      actor_role: 'doctor',
      actor_id: participantId || null,
    });
    toast.success('Session completed');
    await refreshCurrent();
  };

  const handleCancelSession = async (session) => {
    const reason = globalThis.prompt('Enter a cancellation reason');
    if (!reason) return;

    await telemedicineAPI.cancelSession(session.id, {
      reason,
      actor_role: role,
      actor_id: participantId || null,
    });
    toast.success('Session cancelled');
    await refreshCurrent();
  };

  const handleViewSession = (session) => {
    setSelectedSession(session);
  };

  const summary = useMemo(() => {
    return sessions.reduce(
      (acc, session) => {
        const key = String(session.status || 'scheduled').toLowerCase();
        if (acc[key] !== undefined) acc[key] += 1;
        acc.total += 1;
        return acc;
      },
      { total: 0, scheduled: 0, live: 0, completed: 0, cancelled: 0 },
    );
  }, [sessions]);

  const sessionsContent = (() => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-600">Loading sessions…</p>
        </div>
      );
    }

    if (sessions.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">No sessions found</h3>
          <p className="mt-2 text-sm text-slate-600">
            {role === 'doctor'
              ? 'Create a new telemedicine session or adjust the filters.'
              : 'You do not have a scheduled telemedicine session yet.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sessions.map((session) => (
          <TelemedicineSessionCard
            key={session.id}
            session={session}
            role={role}
            onView={handleViewSession}
            onJoin={(currentSession) => setJoinSession(currentSession)}
            onStart={handleStartSession}
            onComplete={handleCompleteSession}
            onCancel={handleCancelSession}
            onOpenLink={(link) => openJoinLink(link)}
          />
        ))}
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('/')} className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Telemedicine</p>
            <h1 className="text-2xl font-bold">Session Hub</h1>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${role === 'patient' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Patient view
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Doctor view
            </button>
            <button
              type="button"
              onClick={() => navigate('/patient/dashboard')}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Patient dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor/dashboard')}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Doctor dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total sessions', value: summary.total, accent: 'blue' },
            { label: 'Scheduled', value: summary.scheduled, accent: 'sky' },
            { label: 'Live', value: summary.live, accent: 'emerald' },
            { label: 'Completed', value: summary.completed, accent: 'slate' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Sessions</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{role === 'doctor' ? 'Manage consultations' : 'Join your consultations'}</h2>
                  <p className="mt-1 text-sm text-slate-600">Filter by status and open the session you need.</p>
                </div>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Status filter</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option || 'all'} value={option}>
                        {option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All statuses'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <TelemedicineStatusBadge status="scheduled" />
                <TelemedicineStatusBadge status="live" />
                <TelemedicineStatusBadge status="completed" />
                <TelemedicineStatusBadge status="cancelled" />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {error}
              </div>
            )}

            {sessionsContent}
          </div>

          <div className="space-y-6">
            {role === 'doctor' && (
              <TelemedicineSessionForm
                submitting={submitting}
                defaultValues={doctorSessionDefaultValues}
                buttonLabel="Create session"
                title="Create a new consultation"
                description="Use this form to generate a room and connect it to an appointment or ad-hoc consultation."
                onSubmit={handleCreateSession}
              />
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Current identity</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{displayName}</h3>
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">Role</dt>
                  <dd className="capitalize">{role}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">Participant ID</dt>
                  <dd className="break-all text-right">{participantId || 'Not set'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <TelemedicineJoinModal
        isOpen={Boolean(joinSession)}
        session={joinSession}
        defaultRole={role}
        defaultParticipantId={participantId}
        defaultDisplayName={displayName}
        onClose={() => setJoinSession(null)}
        onJoin={async ({ session, role: joinRole, participantId: joinParticipantId, displayName: joinDisplayName }) =>
          telemedicineAPI.joinSession(session.id, {
            role: joinRole,
            participant_id: joinParticipantId,
            display_name: joinDisplayName,
          })
        }
      />

      {selectedSession && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Session detail</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedSession.room_name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSession(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Provider</p>
                <p className="mt-1 text-sm text-slate-600">{selectedSession.provider}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Status</p>
                <div className="mt-2"><TelemedicineStatusBadge status={selectedSession.status} /></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Doctor ID</p>
                <p className="mt-1 break-all text-sm text-slate-600">{selectedSession.doctor_id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Patient ID</p>
                <p className="mt-1 break-all text-sm text-slate-600">{selectedSession.patient_id}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Join links</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</p>
                  <p className="mt-1 break-all text-sm text-slate-600">{selectedSession.join_link_doctor || 'Not generated yet'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</p>
                  <p className="mt-1 break-all text-sm text-slate-600">{selectedSession.join_link_patient || 'Not generated yet'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setJoinSession(selectedSession)}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Join session
              </button>
              <button
                type="button"
                onClick={() => navigate(`/telemedicine/sessions/${selectedSession.id}`)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open full page
              </button>
            </div>

            {selectedSession.events?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-900">Event history</h4>
                <div className="mt-3 space-y-3">
                  {selectedSession.events.map((event, index) => (
                    <div key={`${event.event_type}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">{event.event_type}</p>
                      <p className="mt-1">{event.created_at ? new Date(event.created_at).toLocaleString() : '—'}</p>
                      {event.payload && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(event.payload, null, 2)}</pre>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


