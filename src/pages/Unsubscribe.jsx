import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { apiClient } from "@/api/apiClient";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (!email) {
      setStatus("error");
      return;
    }

    apiClient.functions
      .invoke("unsubscribeEmail", { email })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-white/30 mx-auto mb-4" />
            <p className="text-white/50 text-sm">Processing your request…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">You're unsubscribed</h1>
            <p className="text-white/40 text-sm mb-8">
              You won't receive any more marketing emails from Ambient Space.<br />
              You can always reach us at{" "}
              <a href="mailto:support@ambientspace.ai" className="underline" style={{ color: "#1B8FA0" }}>
                support@ambientspace.ai
              </a>
            </p>
            <button
              onClick={() => navigate(createPageUrl("Home"))}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(27,143,160,0.12)", border: "1px solid rgba(27,143,160,0.3)", color: "#1B8FA0" }}
            >
              Back to Home
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-white/40 text-sm mb-8">
              We couldn't process your request. Please email us directly at{" "}
              <a href="mailto:support@ambientspace.ai?subject=Unsubscribe" className="underline" style={{ color: "#1B8FA0" }}>
                support@ambientspace.ai
              </a>{" "}
              and we'll remove you immediately.
            </p>
            <button
              onClick={() => navigate(createPageUrl("Home"))}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              Back to Home
            </button>
          </>
        )}

      </div>
    </div>
  );
}
