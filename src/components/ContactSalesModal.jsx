import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, Mail } from "lucide-react";

/**
 * ContactSalesModal — B2B "Talk to sales" form.
 *
 * Day 9.1 — opens from the B2B Use Case cards (Home + Pricing). Captures
 * name, work email, company, and a short message. Posts to /api/contact
 * which stores in contact_leads and (when Resend is wired) emails support.
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - source: one of 'home_real_estate' | 'home_retailer' | 'pricing_real_estate' | 'pricing_retailer' | 'other'
 *   - title: string  — heading shown at top of modal (e.g. "Talk to our real estate team")
 *   - subtitle: string  — short blurb under the heading
 *   - accentColor: string  — hex color for the focus ring + submit gradient end (matches the card accent)
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactSalesModal({
  open,
  onClose,
  source = "other",
  title = "Talk to sales",
  subtitle = "Tell us a little about your use case — we'll get back to you within one business day.",
  accentColor = "#1B8FA0",
}) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState(null);
  const firstFieldRef = useRef(null);

  // Reset state whenever the modal opens — so reusing it for different
  // sources doesn't carry forward state from a previous submission.
  useEffect(() => {
    if (open) {
      setName(""); setEmail(""); setCompany(""); setMessage("");
      setSubmitting(false); setSubmitted(false); setError(null);
      // Autofocus first field once mounted.
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const valid = EMAIL_RE.test(email.trim()) && message.trim().length >= 10;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          message: message.trim(),
          source,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError("Network error. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl"
            style={{
              background: "#16181A",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-white/8">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${accentColor}26`, border: `1px solid ${accentColor}66` }}
                >
                  <Mail className="w-4 h-4" style={{ color: accentColor }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/8 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            {submitted ? (
              <div className="px-6 py-10 text-center">
                <div
                  className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  <Check className="w-6 h-6 text-emerald-400" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Thanks — we got it.</h3>
                <p className="text-sm text-white/55 leading-relaxed max-w-sm mx-auto">
                  We&apos;ll be in touch within one business day at <span className="text-white/85 font-medium">{email}</span>.
                  Feel free to close this window.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 text-sm font-semibold px-6 py-2.5 rounded-xl text-white/80 border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Name"
                    value={name}
                    onChange={setName}
                    placeholder="Jane Smith"
                    accentColor={accentColor}
                    inputRef={firstFieldRef}
                  />
                  <Field
                    label="Work email"
                    type="email"
                    required
                    value={email}
                    onChange={setEmail}
                    placeholder="jane@company.com"
                    accentColor={accentColor}
                  />
                </div>
                <Field
                  label="Company"
                  value={company}
                  onChange={setCompany}
                  placeholder="Company name"
                  accentColor={accentColor}
                />
                <Field
                  label="What are you trying to do?"
                  required
                  value={message}
                  onChange={setMessage}
                  placeholder="e.g. Stage 200 listings/month for our real-estate platform, or embed AI furniture preview on our product pages."
                  accentColor={accentColor}
                  multiline
                />

                {error && (
                  <div className="px-3 py-2 rounded-xl text-xs"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-sm px-4 py-2.5 rounded-xl text-white/55 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!valid || submitting}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send message"}
                  </button>
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  By submitting, you agree to be contacted by Ambient Space about your inquiry. We won&apos;t share your email.
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, type = "text", required, value, onChange, placeholder, accentColor, multiline, inputRef }) {
  const inputClass = "w-full text-sm px-3 py-2.5 rounded-xl text-white/90 placeholder-white/25 focus:outline-none transition-colors";
  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  };
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-white/45 block mb-1.5">
        {label}{required && <span className="text-[#C9963A] ml-1">*</span>}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${inputClass} resize-none`}
          style={{ ...inputStyle, lineHeight: "1.5" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = `${accentColor}99`)}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        />
      ) : (
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = `${accentColor}99`)}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        />
      )}
    </label>
  );
}
