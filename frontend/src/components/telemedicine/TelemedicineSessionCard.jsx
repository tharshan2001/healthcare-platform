/* eslint-disable */

import PropTypes from 'prop-types';
import TelemedicineStatusBadge from './TelemedicineStatusBadge';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

const shortId = (value) => {
  if (!value) return '—';
  const text = String(value);
  return text.length > 10 ? `${text.slice(0, 8)}…` : text;
};

const actionButtonClass = 'rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

function TelemedicineSessionCard({
  session,
  role,
  onView,
  onJoin,
  onStart,
  onComplete,
  onCancel,
  onOpenLink,
}) {
  if (!session) return null;

  const normalizedStatus = String(session.status || '').toLowerCase();
  const joinLink = role === 'doctor' ? session.join_link_doctor : session.join_link_patient;
  const canJoin = normalizedStatus !== 'completed' && normalizedStatus !== 'cancelled';
  const canManage = role === 'doctor' && ['scheduled', 'live'].includes(normalizedStatus);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <TelemedicineStatusBadge status={session.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {session.provider || 'jitsi'}
            </span>
            {session.appointment_id && (
              <span className="text-xs text-slate-500">Appointment {shortId(session.appointment_id)}</span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">Room {session.room_name || shortId(session.id)}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {formatDateTime(session.scheduled_start_at)} to {formatDateTime(session.scheduled_end_at)}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="font-medium text-slate-900">Your participant ID</p>
              <p>{shortId(role === 'doctor' ? session.doctor_id : session.patient_id)}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Actual start</p>
              <p>{formatDateTime(session.actual_start_at)}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Actual end</p>
              <p>{formatDateTime(session.actual_end_at)}</p>
            </div>
          </div>

          {session.cancel_reason && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="font-semibold">Cancellation reason:</span> {session.cancel_reason}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:min-w-55">
          {onView && (
            <button type="button" onClick={() => onView(session)} className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
              View details
            </button>
          )}
          {canJoin && onJoin && (
            <button type="button" onClick={() => onJoin(session)} className={`${actionButtonClass} bg-blue-600 text-white hover:bg-blue-700`}>
              Join session
            </button>
          )}
          {canManage && onStart && normalizedStatus === 'scheduled' && (
            <button type="button" onClick={() => onStart(session)} className={`${actionButtonClass} bg-emerald-600 text-white hover:bg-emerald-700`}>
              Start session
            </button>
          )}
          {canManage && onComplete && normalizedStatus === 'live' && (
            <button type="button" onClick={() => onComplete(session)} className={`${actionButtonClass} bg-slate-900 text-white hover:bg-slate-800`}>
              Mark complete
            </button>
          )}
          {canManage && onCancel && (
            <button type="button" onClick={() => onCancel(session)} className={`${actionButtonClass} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}>
              Cancel session
            </button>
          )}
          {joinLink && onOpenLink && (
            <button type="button" onClick={() => onOpenLink(joinLink, session)} className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
              Open your join link
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

TelemedicineSessionCard.propTypes = {
  session: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    room_name: PropTypes.string,
    status: PropTypes.string,
    provider: PropTypes.string,
    appointment_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    doctor_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    patient_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    scheduled_start_at: PropTypes.string,
    scheduled_end_at: PropTypes.string,
    actual_start_at: PropTypes.string,
    actual_end_at: PropTypes.string,
    cancel_reason: PropTypes.string,
    join_link_doctor: PropTypes.string,
    join_link_patient: PropTypes.string,
  }),
  role: PropTypes.oneOf(['doctor', 'patient']),
  onView: PropTypes.func,
  onJoin: PropTypes.func,
  onStart: PropTypes.func,
  onComplete: PropTypes.func,
  onCancel: PropTypes.func,
  onOpenLink: PropTypes.func,
};

export default TelemedicineSessionCard;


