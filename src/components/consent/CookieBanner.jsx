import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function logConsent(action, prefs) {
  await base44.entities.ConsentLog.create({
    session_id: generateSessionId(),
    necessary: true,
    functional: prefs.functional,
    marketing: prefs.marketing,
    action,
    user_agent: navigator.userAgent.slice(0, 200),
  });
}

export default function CookieBanner({ onConsent }) {
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ functional: false, marketing: false });

  const acceptAll = () => {
    const p = { functional: true, marketing: true };
    onConsent({ necessary: true, ...p });
    logConsent("accept_all", p).catch(() => {});
  };

  const rejectAll = () => {
    const p = { functional: false, marketing: false };
    onConsent({ necessary: true, ...p });
    logConsent("reject_all", p).catch(() => {});
  };

  const saveCustom = () => {
    onConsent({ necessary: true, ...prefs });
    logConsent("custom", prefs).catch(() => {});
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6"
      >
        <div className="max-w-3xl mx-auto bg-[#141418] border border-white/12 rounded-2xl shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-white font-semibold text-sm">Privacy & Cookies</h2>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">
                We use cookies and similar technologies. Marketing cookies (Amazon, IKEA, eBay) are loaded only with your consent.{" "}
                <Link to="/privacy-policy" className="underline hover:text-white/70 transition-colors">Privacy Policy</Link>
                {" · "}
                <Link to="/terms-of-service" className="underline hover:text-white/70 transition-colors">Terms</Link>
              </p>
            </div>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 mb-4 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Customize settings
          </button>

          {expanded && (
            <div className="mb-4 space-y-3 border-t border-white/8 pt-4">
              {[
                { key: "necessary", label: "Necessary", desc: "Technically required. Cannot be disabled.", locked: true },
                { key: "functional", label: "Functional", desc: "Saves your design preferences and session data." },
                { key: "marketing", label: "Marketing", desc: "Amazon Associates, IKEA, eBay – affiliate link tracking." },
              ].map(({ key, label, desc, locked }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white/80 text-xs font-medium">{label}</p>
                    <p className="text-white/35 text-xs">{desc}</p>
                  </div>
                  <button
                    disabled={locked}
                    onClick={() => !locked && setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                    className={`mt-0.5 w-9 h-5 rounded-full border transition-all shrink-0 ${
                      locked || (key !== "necessary" ? prefs[key] : true)
                        ? "bg-violet-500 border-violet-400"
                        : "bg-white/8 border-white/15"
                    } ${locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${
                        locked || (key !== "necessary" ? prefs[key] : true) ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
              <button
                onClick={saveCustom}
                className="mt-2 w-full py-2 rounded-xl text-xs font-medium border border-white/15 text-white/60 hover:border-white/25 hover:text-white/80 transition-all"
              >
                Save selection
              </button>
            </div>
          )}

          {/* Main action buttons — equal prominence */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={rejectAll}
              className="py-3 rounded-xl text-sm font-semibold border border-white/15 text-white/70 hover:border-white/30 hover:text-white transition-all"
            >
              Reject
            </button>
            <button
              onClick={acceptAll}
              className="py-3 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all"
            >
              Accept
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}