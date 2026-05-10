import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiClient } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

/**
 * /Invite/:code (or /invite?code=…) — landing page for a beta invite link.
 *
 * Day 13. Two states:
 *
 *   1. Logged out: stash the code in localStorage as `pending_invite_code`,
 *      then send the user to /login. AuthContext picks up the stashed code
 *      after signup and POSTs to /api/redeemInvite once the session lands.
 *
 *   2. Logged in: redeem immediately. Show success / failure inline. After
 *      success, route to /Studio with the new credit balance refreshed.
 *
 * The invite-code value is treated as opaque — server validates it; we
 * just display a friendly status here.
 */
export default function Invite() {
  const { code: paramCode } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  const code = (paramCode || search.get("code") || "").trim().toUpperCase();
  const [status, setStatus] = useState("idle"); // idle | redeeming | success | error
  const [error, setError]   = useState(null);
  const [result, setResult] = useState(null);

  // Stash the code so AuthContext can finish the redemption after signup.
  useEffect(() => {
    if (code && typeof window !== "undefined") {
      try { window.localStorage.setItem("pending_invite_code", code); } catch { /* private mode */ }
    }
  }, [code]);

  // If logged in, redeem immediately. Otherwise just hold and offer the sign-in CTA.
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user || !code) return;
    if (status !== "idle") return;
    setStatus("redeeming");
    apiClient.functions.invoke("redeemInvite", { code })
      .then((response) => {
        const payload = response?.data ?? response;
        if (payload?.error) {
          setStatus("error");
          setError(payload.error);
          return;
        }
        setResult(payload);
        setStatus("success");
        // Clear the stashed code on success — next visit shouldn't re-fire.
        try { window.localStorage.removeItem("pending_invite_code"); } catch { /* ignore */ }
      })
      .catch((err) => {
        setStatus("error");
        setError(err?.message || "Could not redeem invite. Please try again.");
      });
  }, [user, isLoadingAuth, code, status]);

  if (!code) {
    return (
      <Center>
        <H1>Missing invite code</H1>
        <P>This URL doesn’t include an invite code. If you have one, paste it after the slash like <code className="text-white/60">/invite/BETA50</code>.</P>
      </Center>
    );
  }

  // Logged-out: pitch + sign-up button. Code is already in localStorage.
  if (!isLoadingAuth && !user) {
    return (
      <Center>
        <Badge>Beta invite · {code}</Badge>
        <H1>You’re invited to Ambient Space.</H1>
        <P>Create an account and your beta credits will be applied automatically. No payment required.</P>
        <button
          onClick={() => apiClient.auth.redirectToLogin(`/invite/${code}`)}
          className="text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
        >
          Sign up to claim
        </button>
      </Center>
    );
  }

  if (status === "redeeming" || isLoadingAuth) {
    return (
      <Center>
        <Loader2 className="w-10 h-10 animate-spin text-white/60 mb-5" />
        <H1>Activating your beta access…</H1>
        <P>Hold on a moment.</P>
      </Center>
    );
  }

  if (status === "success") {
    return (
      <Center>
        <CheckCircle className="w-12 h-12 text-emerald-400 mb-5" />
        <H1>You’re in.</H1>
        <P>
          {result?.already_redeemed
            ? `You already redeemed this code — your ${result.plan_type} plan is active.`
            : `${result?.plan_type === "pro" ? "Pro" : result?.plan_type} plan unlocked. ${result?.credits_remaining} credits ready to spend.`}
          {typeof result?.remaining_slots === "number" && !result.already_redeemed && (
            <span className="block mt-2 text-white/35">{result.remaining_slots} of the original beta slots remaining.</span>
          )}
        </P>
        <button
          onClick={() => navigate(createPageUrl("Studio"))}
          className="text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
        >
          Open Studio
        </button>
      </Center>
    );
  }

  // Error.
  return (
    <Center>
      <XCircle className="w-12 h-12 text-red-400 mb-5" />
      <H1>Couldn’t redeem this invite.</H1>
      <P>{error || "Something went wrong."}</P>
      <button
        onClick={() => navigate(createPageUrl("Studio"))}
        className="text-white/70 font-semibold px-5 py-2.5 rounded-xl text-sm border border-white/15 hover:bg-white/5 transition-all"
      >
        Continue to Studio
      </button>
    </Center>
  );
}

// ---- tiny inline UI helpers (kept local; no new components warranted) ----
function Center({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}
function Badge({ children }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
      style={{ background: "rgba(27,143,160,0.1)", border: "1px solid rgba(27,143,160,0.25)" }}>
      <Sparkles className="w-3.5 h-3.5" style={{ color: "#1B8FA0" }} />
      <span className="text-xs font-semibold" style={{ color: "#1B8FA0" }}>{children}</span>
    </div>
  );
}
function H1({ children }) {
  return <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{children}</h1>;
}
function P({ children }) {
  return <p className="text-white/60 text-base leading-relaxed mb-7">{children}</p>;
}
