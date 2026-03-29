import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM           = "Ambient Space <hello@ambientspace.ai>";
const APP_URL        = "https://ambientspace.ai";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { subject, html, segment } = await req.json();
  if (!subject || !html) return Response.json({ error: "subject and html are required" }, { status: 400 });

  // Fetch all user credits
  let allCredits = await base44.asServiceRole.entities.UserCredits.list("-created_date", 2000);

  // Segment filtering
  if (segment === "free")  allCredits = allCredits.filter((u) => u.plan_type === "free");
  if (segment === "paid")  allCredits = allCredits.filter((u) => u.plan_type !== "free");
  if (segment === "basic") allCredits = allCredits.filter((u) => u.plan_type === "basic");
  if (segment === "pro")   allCredits = allCredits.filter((u) => u.plan_type === "pro");
  // "active" = users who have used credits (credits_remaining < starting amount based on plan)
  if (segment === "active") allCredits = allCredits.filter((u) => u.total_purchased > 0 || u.credits_remaining < 2);

  const emails = allCredits.map((u) => u.user_email).filter(Boolean);

  if (emails.length === 0) return Response.json({ sent: 0, segment, message: "No users match this segment" });

  // Send in batches of 50 to avoid rate limits
  const BATCH = 50;
  let sent = 0, failed = 0;

  const wrappedHtml = wrapInTemplate(subject, html);

  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);

    // Send to each individually so unsubscribes work properly
    const results = await Promise.allSettled(batch.map((to) =>
      fetch("https://api.resend.com/emails", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject, html: wrappedHtml }),
      })
    ));

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) sent++;
      else failed++;
    }

    // Small delay between batches
    if (i + BATCH < emails.length) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[sendMarketingNewsletter] segment=${segment || "all"} sent=${sent} failed=${failed}`);
  return Response.json({ sent, failed, total: emails.length, segment: segment || "all" });
});

function wrapInTemplate(subject, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:48px 20px 40px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
            Ambient&nbsp;<span style="color:#6EC6C6;">Space</span>
          </span>
        </td></tr>
        <!-- Content -->
        <tr><td style="background:#111114;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;color:rgba(255,255,255,0.8);font-size:15px;line-height:1.8;">
          ${content}
        </td></tr>
        <!-- CTA -->
        <tr><td align="center" style="padding:28px 0 0;">
          <a href="${APP_URL}/Studio" style="display:inline-block;background:linear-gradient(135deg,#1B8FA0,#C9963A);color:#ffffff;font-size:15px;font-weight:800;padding:14px 40px;border-radius:14px;text-decoration:none;">
            Open Studio →
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding:28px 0 0;border-top:1px solid rgba(255,255,255,0.06);margin-top:28px;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.18);">
            © 2026 AmbientSpace.ai · 
            <a href="mailto:support@ambientspace.ai" style="color:rgba(255,255,255,0.35);text-decoration:none;">support@ambientspace.ai</a>
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.12);">
            You're receiving this because you signed up at ambientspace.ai.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}