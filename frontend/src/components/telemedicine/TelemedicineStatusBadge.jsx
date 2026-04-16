
const STATUS_STYLES = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TelemedicineStatusBadge({ status }) {
  const normalizedStatus = String(status || 'scheduled').toLowerCase();
  const className = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.scheduled;
  const label = STATUS_LABELS[normalizedStatus] || normalizedStatus;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
}


