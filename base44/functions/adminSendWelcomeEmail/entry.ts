import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "Ambient Space <hello@ambientspace.ai>";
const APP_URL = "https://ambientspace.ai";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email, name } = await req.json();
  if (!email) return Response.json({ error: 'email required' }, { status: 400 });

  const firstName = name?.split(" ")[0] || email.split("@")[0];

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: "Welcome to Ambient Space — your first design is ready ✦",
      html: buildEmail(firstName),
    }),
  });

  const body = await emailRes.text();
  if (!emailRes.ok) {
    console.error("[adminSendWelcomeEmail] Resend error:", emailRes.status, body);
    return Response.json({ error: body }, { status: 500 });
  }

  console.log("[adminSendWelcomeEmail] Sent to", email);
  return Response.json({ sent: true });
});

function buildEmail(name) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Welcome to Ambient Space</title></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:48px 20px 40px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:36px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">Ambient&nbsp;<span style="color:#6EC6C6;">Space</span></span>
        </td></tr>
        <tr>
          <td style="background:linear-gradient(135deg,#1B8FA0 0%,#C9963A 100%);border-radius:24px;padding:44px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.65);">Welcome aboard</p>
            <h1 style="margin:0 0 14px;font-size:30px;font-weight:900;color:#ffffff;line-height:1.2;">Your first AI design<br/>is ready, ${name} ✦</h1>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.85);line-height:1.7;">Upload any room photo and watch AI redesign it in seconds.</p>
            <a href="${APP_URL}/Studio" style="display:inline-block;background:#ffffff;color:#0A0A0B;font-size:15px;font-weight:800;padding:15px 36px;border-radius:14px;text-decoration:none;">Start designing →</a>
          </td>
        </tr>
        <tr><td style="padding:20px 0 4px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#111114;border:1px solid rgba(27,143,160,0.25);border-radius:16px;padding:20px 24px;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Your balance</p>
              <p style="margin:0;font-size:26px;font-weight:900;color:#6EC6C6;">2 credits</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.35);">= 1 full AI generation · Free, no card needed</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:28px 0 0;">
          <a href="${APP_URL}/Studio" style="display:inline-block;background:linear-gradient(135deg,#1B8FA0,#C9963A);color:#ffffff;font-size:15px;font-weight:800;padding:15px 44px;border-radius:14px;text-decoration:none;">Design my room now</a>
        </td></tr>
        <tr><td align="center" style="padding:20px 0 0;">
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.25);">Need more generations? <a href="${APP_URL}/Pricing" style="color:#6EC6C6;text-decoration:none;font-weight:600;">View plans →</a></p>
        </td></tr>
        <tr><td align="center" style="padding:36px 0 0;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.18);">© 2026 AmbientSpace.ai · <a href="mailto:support@ambientspace.ai" style="color:rgba(255,255,255,0.35);text-decoration:none;">support@ambientspace.ai</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}