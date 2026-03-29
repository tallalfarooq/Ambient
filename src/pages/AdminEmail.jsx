import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Users, RefreshCw, Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

const SEGMENTS = [
  { id: "all",    label: "All Users",         desc: "Everyone who signed up" },
  { id: "free",   label: "Free Users",        desc: "On the free plan (2 credits)" },
  { id: "paid",   label: "All Paid Users",    desc: "Basic + Pro plan users" },
  { id: "basic",  label: "Basic Plan",        desc: "Basic plan purchasers" },
  { id: "pro",    label: "Pro Plan",          desc: "Pro plan purchasers" },
  { id: "active", label: "Active Users",      desc: "Users who have used credits" },
];

export default function AdminEmail() {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [segment,   setSegment]   = useState("all");
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke("syncResendContacts", {});
      setSyncResult(res.data);
      toast.success(`Synced ${res.data.synced} contacts to Resend`);
    } catch (err) {
      toast.error("Sync failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim())    { toast.error("Email body is required"); return; }
    if (!window.confirm(`Send to all "${SEGMENTS.find(s=>s.id===segment)?.label}" users?`)) return;

    setSending(true);
    setSendResult(null);
    try {
      const res = await base44.functions.invoke("sendMarketingNewsletter", { subject, html: body, segment });
      setSendResult(res.data);
      toast.success(`Sent to ${res.data.sent} users!`);
    } catch (err) {
      toast.error("Send failed: " + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-white/40" />
    </div>
  );

  if (!user || user.role !== "admin") return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <p className="text-white/40">Access restricted to admins.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Mail className="w-6 h-6" style={{ color: "#1B8FA0" }} />
            Email Marketing
          </h1>
          <p className="text-white/40 text-sm mt-1">Sync contacts to Resend and send newsletters to your users</p>
        </div>

        {/* Sync Section */}
        <div className="rounded-3xl p-6 mb-6 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "#6EC6C6" }} />
                Sync Users to Resend Audience
              </h2>
              <p className="text-white/35 text-sm mt-0.5">Pushes all registered users to your Resend contact list</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.3)", color: "#6EC6C6" }}
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>

          {syncResult && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(27,143,160,0.08)", border: "1px solid rgba(27,143,160,0.2)" }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#6EC6C6" }} />
              <span style={{ color: "#6EC6C6" }}>
                ✓ {syncResult.synced} contacts synced · {syncResult.failed} failed · Audience ID: <code className="text-xs opacity-70">{syncResult.audienceId}</code>
              </span>
            </div>
          )}
        </div>

        {/* Newsletter Section */}
        <div className="rounded-3xl p-6 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
          <h2 className="font-semibold flex items-center gap-2 mb-5">
            <Send className="w-4 h-4" style={{ color: "#C9963A" }} />
            Send Newsletter
          </h2>

          {/* Segment picker */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">Target Segment</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSegment(s.id)}
                  className="text-left p-3 rounded-2xl border text-xs transition-all"
                  style={{
                    borderColor: segment === s.id ? "rgba(201,150,58,0.5)" : "rgba(255,255,255,0.08)",
                    background:  segment === s.id ? "rgba(201,150,58,0.1)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="font-semibold" style={{ color: segment === s.id ? "#C9963A" : "rgba(255,255,255,0.7)" }}>{s.label}</div>
                  <div className="text-white/30 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. 🏠 New styles just dropped — redesign your room today"
              className="w-full text-sm px-4 py-3 rounded-xl text-white placeholder-white/20 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,150,58,0.4)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          {/* Body */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
              Email Body <span className="normal-case font-normal text-white/25">(HTML or plain text)</span>
            </label>
            <textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`<h2 style="color:#ffffff;">Big news from AmbientSpace ✦</h2>\n<p>We just added 3 new design styles...</p>\n<p><a href="https://ambientspace.ai/Studio" style="color:#6EC6C6;">Try them now →</a></p>`}
              className="w-full text-sm px-4 py-3 rounded-xl text-white/80 placeholder-white/20 focus:outline-none resize-y font-mono"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 200 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,150,58,0.4)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
            <p className="text-xs text-white/25 mt-1.5">Your content will be wrapped in the AmbientSpace email template automatically.</p>
          </div>

          {/* Send result */}
          {sendResult && (
            <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-2xl text-sm"
              style={{ background: sendResult.failed > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${sendResult.failed > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
              {sendResult.failed > 0
                ? <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                : <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              }
              <span style={{ color: sendResult.failed > 0 ? "#f87171" : "#34d399" }}>
                ✓ Sent to {sendResult.sent} users · {sendResult.failed} failed · Segment: {sendResult.segment}
              </span>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "white" }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : `Send to "${SEGMENTS.find(s => s.id === segment)?.label}"`}
          </button>
        </div>

      </div>
    </div>
  );
}