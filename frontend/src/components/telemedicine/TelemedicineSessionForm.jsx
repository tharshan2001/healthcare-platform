
import { useEffect, useState } from 'react';

const DEFAULT_FORM = {
  appointment_id: '',
  doctor_id: '',
  patient_id: '',
  scheduled_start_at: '',
  scheduled_end_at: '',
  provider: 'jitsi',
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function TelemedicineSessionForm({
  onSubmit,
  submitting = false,
  defaultValues = {},
  buttonLabel = 'Schedule session',
  title = 'Schedule a telemedicine session',
  description = 'Create a session for a confirmed appointment or a new consultation.',
}) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    setForm({
      appointment_id: defaultValues.appointment_id || '',
      doctor_id: defaultValues.doctor_id || '',
      patient_id: defaultValues.patient_id || '',
      scheduled_start_at: toDateTimeLocal(defaultValues.scheduled_start_at),
      scheduled_end_at: toDateTimeLocal(defaultValues.scheduled_end_at),
      provider: defaultValues.provider || 'jitsi',
    });
  }, [defaultValues]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const start = form.scheduled_start_at ? new Date(form.scheduled_start_at) : null;
    const end = form.scheduled_end_at ? new Date(form.scheduled_end_at) : null;

    if (!form.doctor_id || !form.patient_id || !start || !end) {
      return;
    }

    if (end <= start) {
      return;
    }

    await onSubmit({
      appointment_id: form.appointment_id || null,
      doctor_id: form.doctor_id.trim(),
      patient_id: form.patient_id.trim(),
      scheduled_start_at: start.toISOString(),
      scheduled_end_at: end.toISOString(),
      provider: form.provider,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Telemedicine setup</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Appointment ID (optional)</span>
          <input
            type="text"
            value={form.appointment_id}
            onChange={(e) => handleChange('appointment_id', e.target.value)}
            placeholder="Existing appointment UUID"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Doctor ID</span>
          <input
            type="text"
            value={form.doctor_id}
            onChange={(e) => handleChange('doctor_id', e.target.value)}
            placeholder="UUID"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Patient ID</span>
          <input
            type="text"
            value={form.patient_id}
            onChange={(e) => handleChange('patient_id', e.target.value)}
            placeholder="UUID"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Scheduled start</span>
          <input
            type="datetime-local"
            value={form.scheduled_start_at}
            onChange={(e) => handleChange('scheduled_start_at', e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Scheduled end</span>
          <input
            type="datetime-local"
            value={form.scheduled_end_at}
            onChange={(e) => handleChange('scheduled_end_at', e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Provider</span>
          <select
            value={form.provider}
            onChange={(e) => handleChange('provider', e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="jitsi">Jitsi</option>
            <option value="twilio">Twilio</option>
          </select>
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : buttonLabel}
          </button>
          <p className="text-xs text-slate-500">Dates are converted to UTC before calling the service.</p>
        </div>
      </form>
    </section>
  );
}


