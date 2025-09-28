import React from 'react';

const initial = { fullName: '', nic: '', address: '', phone: '', terms: false };

export default function BillingInfoModal({ open, onClose, onSubmit }) {
  const [form, setForm] = React.useState(initial);
  const [touched, setTouched] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(initial);
      setTouched({});
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const validate = React.useCallback((f) => {
    const next = {};
    // Full name: required, 2-80
    if (!f.fullName.trim()) next.fullName = 'Full name is required';
    else if (f.fullName.trim().length < 2) next.fullName = 'At least 2 characters';
    else if (f.fullName.trim().length > 80) next.fullName = 'Too long';
    // NIC: required, basic pattern (supports older/new formats)
    if (!f.nic.trim()) next.nic = 'NIC is required';
    else if (!/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(f.nic.trim())) next.nic = 'Enter a valid NIC';
    // Address: required, min length
    if (!f.address.trim()) next.address = 'Billing address is required';
    else if (f.address.trim().length < 5) next.address = 'Please enter a more complete address';
    // Phone: required, simple phone check (Sri Lanka + other)
    if (!f.phone.trim()) next.phone = 'Telephone is required';
    else if (!/^(\+?[0-9]{9,15})$/.test(f.phone.trim())) next.phone = 'Enter a valid phone number';
    // Terms
    if (!f.terms) next.terms = 'You must agree to the terms & conditions';
    return next;
  }, []);

  React.useEffect(() => {
    setErrors(validate(form));
  }, [form, validate]);

  const hasErrors = Object.keys(errors).length > 0;

  const update = (field) => (e) => {
    const value = field === 'terms' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ fullName: true, nic: true, address: true, phone: true, terms: true });
    const nowErrors = validate(form);
    setErrors(nowErrors);
    if (Object.keys(nowErrors).length > 0) return;
    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        nic: form.nic.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        termsAcceptedAt: new Date().toISOString(),
      };
      await onSubmit?.(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-xl p-6 text-sm">
        <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-gray-600">Full Name</label>
            <input
              className={`mt-1 w-full border rounded px-3 py-2 ${touched.fullName && errors.fullName ? 'border-red-500' : 'border-gray-300'}`}
              value={form.fullName}
              onChange={update('fullName')}
              onBlur={blur('fullName')}
              placeholder="e.g., Sandun Perera"
            />
            {touched.fullName && errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>
          <div>
            <label className="block text-gray-600">NIC</label>
            <input
              className={`mt-1 w-full border rounded px-3 py-2 ${touched.nic && errors.nic ? 'border-red-500' : 'border-gray-300'}`}
              value={form.nic}
              onChange={update('nic')}
              onBlur={blur('nic')}
              placeholder="e.g., 991234567V or 200012345678"
            />
            {touched.nic && errors.nic && <p className="text-xs text-red-500 mt-1">{errors.nic}</p>}
          </div>
          <div>
            <label className="block text-gray-600">Billing Address</label>
            <textarea
              className={`mt-1 w-full border rounded px-3 py-2 min-h-[70px] ${touched.address && errors.address ? 'border-red-500' : 'border-gray-300'}`}
              value={form.address}
              onChange={update('address')}
              onBlur={blur('address')}
              placeholder="Street, City, Postal Code"
            />
            {touched.address && errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>
          <div>
            <label className="block text-gray-600">Telephone</label>
            <input
              className={`mt-1 w-full border rounded px-3 py-2 ${touched.phone && errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              value={form.phone}
              onChange={update('phone')}
              onBlur={blur('phone')}
              placeholder="e.g., +94771234567"
            />
            {touched.phone && errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
          <label className="flex items-start gap-2 mt-2">
            <input type="checkbox" checked={form.terms} onChange={update('terms')} onBlur={blur('terms')} />
            <span>I agree to the <a href="/terms" target="_blank" className="text-pink-600 hover:underline">terms & conditions</a>.</span>
          </label>
          {touched.terms && errors.terms && <p className="text-xs text-red-500">{errors.terms}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button type="submit" disabled={submitting || hasErrors} className={`px-4 py-2 rounded text-white ${submitting || hasErrors ? 'bg-gray-300 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700'}`}>{submitting ? 'Please wait…' : 'Pay Now'}</button>
        </div>
      </form>
    </div>
  );
}
