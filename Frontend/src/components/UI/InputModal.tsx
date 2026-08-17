import { useState, useEffect } from "react";
import { Modal } from "./Modal";

interface InputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (value: string) => void;
}

export function InputModal({
  open,
  onOpenChange,
  title,
  description,
  label = "Infrastructure name",
  placeholder = "production-web-cluster",
  initialValue = "",
  submitLabel,
  loading = false,
  onSubmit,
}: InputModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setTouched(false);
    }
  }, [open, initialValue]);

  const validate = (val: string) => {
    if (!val.trim()) return "Infrastructure name is required.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const validationError = validate(trimmed);

    if (validationError) {
      setError(validationError);
      setTouched(true);
      return;
    }

    onSubmit(trimmed);
  };

  const showError = touched && error;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      loading={loading}
    >
      <form onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium text-[#AAB4C5] mb-1.5">
            {label}
          </label>

          <input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (touched) {
                const validationError = validate(e.target.value);
                setError(validationError);
              }
            }}
            onBlur={() => {
              setTouched(true);
              setError(validate(value));
            }}
            onFocus={(e) => e.target.select()}
            placeholder={placeholder}
            maxLength={64}
            disabled={loading}
            className={`w-full h-9 rounded-lg bg-[#0B0E14] border text-[13px] text-[#EDF1F7] placeholder-[#677185] px-3 outline-none transition-colors duration-150 ${
              showError
                ? "border-[#F0564A] shadow-[0_0_0_3px_rgba(240,86,74,0.16)]"
                : "border-[#273042] hover:border-[#35415A] focus:border-[#5B8CFF] focus:shadow-[0_0_0_3px_rgba(91,140,255,0.18)]"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          {showError && (
            <p className="text-xs text-[#F0564A] mt-1.5 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
                <line x1="6" y1="3.5" x2="6" y2="6.5" stroke="currentColor" strokeWidth="1" />
                <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
              </svg>
              {error}
            </p>
          )}

          {value.length >= 48 && !showError && (
            <p className="text-[11px] text-[#677185] text-right mt-1.5">
              {value.length}/64
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-8 px-3 rounded-lg bg-[#1D2432] border border-[#273042] text-[13px] font-medium text-[#AAB4C5] hover:bg-[#232B3B] hover:border-[#35415A] hover:text-[#EDF1F7] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!value.trim() || loading}
            className="h-8 px-3 rounded-lg bg-[#5B8CFF] text-[13px] font-medium text-[#081018] hover:bg-[#7AA2FF] active:bg-[#4C7DF0] active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-[#081018]/30 border-t-[#081018] rounded-full animate-spin" />
            )}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}