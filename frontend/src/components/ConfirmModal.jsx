import React from 'react';

const ConfirmModal = ({
  open,
  title = 'Are you sure?',
  description,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={loading ? undefined : onCancel} />

      {/* Dialog */}
      <div className="relative z-[1001] w-[90%] max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-70"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
