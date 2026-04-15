
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

const INITIAL_STATE = {
  displayName: '',
  participantId: '',
  role: 'patient',
};

export default function TelemedicineJoinModal({
  isOpen,
  session,
  defaultRole = 'patient',
  defaultParticipantId = '',
  defaultDisplayName = '',
  onClose,
  onJoin,
}) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [joinResult, setJoinResult] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setForm({
        displayName: defaultDisplayName,
        participantId: defaultParticipantId,
        role: defaultRole,
      });
      setJoinResult(null);
      setLoading(false);
      return;
    }

    setForm({
      displayName: defaultDisplayName,
      participantId: defaultParticipantId,
      role: defaultRole,
    });
    setJoinResult(null);
  }, [isOpen, defaultRole, defaultParticipantId, defaultDisplayName]);

  const title = useMemo(() => {
    if (!session) return 'Join telemedicine session';
    return `Join ${session.room_name || 'telemedicine session'}`;
  }, [session]);

  if (!isOpen || !session) return null;

  const handleJoin = async () => {
    if (!form.participantId || !form.displayName.trim()) {
      toast.error('Please provide your display name and participant ID');
      return;
    }

    setLoading(true);
    try {
      const result = await onJoin({
        session,
        role: form.role,
        participantId: form.participantId.trim(),
        displayName: form.displayName.trim(),
      });
      setJoinResult(result);
      if (result?.join_url) {
        toast.success('Join details ready');
      }
    } catch (error) {
      toast.error(error?.message || 'Unable to join session');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value, label = 'value') => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label}`);
    }
  };

  const openJoinUrl = () => {
    if (!joinResult?.join_url) return;
    if (/^https?:\/\//i.test(joinResult.join_url)) {
      globalThis.open(joinResult.join_url, '_blank', 'noopener,noreferrer');
      return;
    }
    toast('This provider uses a custom join URL. Copy the link or token for your meeting app.', {
      icon: 'ℹ️',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">Telemedicine</p>
              <h2 className="mt-1 text-2xl font-bold">{title}</h2>
              <p className="mt-1 text-sm text-blue-100">
                Provider: {session.provider || 'jitsi'} · Status: {String(session.status || '').toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Session summary</p>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-900">Room</p>
                  <p className="break-all">{session.room_name}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Join link</p>
                  <p className="break-all">{session.join_link_doctor || session.join_link_patient || 'Will be generated after joining'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Scheduled start</p>
                  <p>{session.scheduled_start_at ? new Date(session.scheduled_start_at).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Scheduled end</p>
                  <p>{session.scheduled_end_at ? new Date(session.scheduled_end_at).toLocaleString() : '—'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Display name</span>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))}
                  placeholder="Dr. Jane Doe"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Participant ID</span>
                <input
                  value={form.participantId}
                  onChange={(e) => setForm((current) => ({ ...current, participantId: e.target.value }))}
                  placeholder="UUID or identifier"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </label>

            {joinResult === null ? (
              <button
                type="button"
                onClick={handleJoin}
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Preparing join link…' : 'Join session'}
              </button>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openJoinUrl}
                  className="rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700"
                >
                  Open join link
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(joinResult.access_token, 'access token')}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Copy token
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Join details</p>
              <p className="mt-1 text-sm text-slate-600">
                After joining, you will receive a provider-specific URL and access token. For Jitsi, the browser opens directly. For Twilio, copy the token into the client that uses it.
              </p>
            </div>

            {joinResult ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Join URL</p>
                  <p className="mt-2 break-all text-sm text-slate-700">{joinResult.join_url}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(joinResult.join_url, 'join URL')}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={openJoinUrl}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Open
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access token</p>
                  <p className="mt-2 break-all text-sm text-slate-700">{joinResult.access_token}</p>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Token expiry</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {joinResult.token_expires_at ? new Date(joinResult.token_expires_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                Your join link and token will appear here once you request access.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


