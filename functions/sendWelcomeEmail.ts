import { createClientFromRequest } from "https://esm.sh/@base44/deno-sdk@latest";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM           = "Ambient Space <hello@ambientspace.ai>";
const APP_URL        = "https://ambientspace.ai";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const client = createClientFromRequest(req);

  // Auth guard — must be a signed-in user
  let user: any;
  try { user = await client.auth.me(); } catch { return new Response("Unauthorized", { status: 401 }); }
  if (!user?.email) return new Response("Unauthorized", { status: 401 });

  // Idempotency guard — if UserCredits already exists, welcome email was already sent
  const existing = await client.asServiceRole.entities.UserCredits.filter({ user_email: user.email });
  if (existing.length > 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "already_welcomed" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  // Create initial credits record (2 credits = 1 free full generation)
  await client.asServiceRole.entities.UserCredits.create({
    user_email:       user.email,
    credits_remaining: 2,
    plan_type:        "free",
    total_purchased:  0,
  });

  // Send welcome email via Resend
  const name = user.full_name?.split(" ")[0] || user.email.split("@")[0];

  const emailRes = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    FROM,
      to:      [user.email],
      subject: "Welcome to Ambient Space — your first design is ready ✦",
      html:    buildEmail(name),
    }),
  });

  if (!emailRes.ok) {
    console.error("Resend error:", await emailRes.text());
    // Don't fail the request — credits were created, email failure is non-critical
  }

  return new Response(JSON.stringify({ sent: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildEmail(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Ambient Space</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:48px 20px 40px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:36px;">
            <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              Ambient&nbsp;<span style="color:#6EC6C6;">Space</span>
            </span>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="background:linear-gradient(135deg,#1B8FA0 0%,#C9963A 100%);border-radius:24px;padding:44px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.65);">Welcome aboard</p>
            <h1 style="margin:0 0 14px;font-size:30px;font-weight:900;color:#ffffff;line-height:1.2;">
              Your first AI design<br/>is ready, ${name} ✦
            </h1>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.85);line-height:1.7;max-width:380px;display:inline-block;">
              Upload any room photo and watch AI redesign it in seconds.<br/>No design skills needed — just your vision.
            </p>
            <br/>
            <a href="${APP_URL}/Studio"
               style="display:inline-block;background:#ffffff;color:#0A0A0B;font-size:15px;font-weight:800;padding:15px 36px;border-radius:14px;text-decoration:none;letter-spacing:-0.2px;">
              Start designing →
            </a>
          </td>
        </tr>

        <!-- Credits badge -->
        <tr>
          <td style="padding:20px 0 4px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#111114;border:1px solid rgba(27,143,160,0.25);border-radius:16px;padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Your balance</p>
                        <p style="margin:0;font-size:26px;font-weight:900;color:#6EC6C6;">2 credits</p>
                        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.35);">= 1 full AI generation · Free, no card needed</p>
                      </td>
                      <td align="right" valign="middle">
                        <span style="font-size:32px;">✦</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- How it works -->
        <tr>
          <td style="padding:16px 0 4px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111114;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:24px;">
              <tr>
                <td>
                  <p style="margin:0 0 20px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.25);">How it works</p>

                  ${[
                    ["📸", "Upload a photo",  "Any room — phone camera is fine"],
                    ["🎨", "Choose a style",  "Modern, Scandi, Industrial, Art Deco and more"],
                    ["✨", "AI generates",    "Your redesigned room in 20–35 seconds"],
                    ["🛍️", "Shop the look",  "Find and buy the exact furniture shown"],
                  ].map(([icon, title, desc]) => `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                    <tr>
                      <td width="40" valign="top" style="font-size:20px;padding-top:2px;">${icon}</td>
                      <td>
                        <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">${title}</p>
                        <p style="margin:2px 0 0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.5;">${desc}</p>
                      </td>
                    </tr>
                  </table>`).join("")}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bottom CTA -->
        <tr>
          <td align="center" style="padding:28px 0 0;">
            <a href="${APP_URL}/Studio"
               style="display:inline-block;background:linear-gradient(135deg,#1B8FA0,#C9963A);color:#ffffff;font-size:15px;font-weight:800;padding:15px 44px;border-radius:14px;text-decoration:none;">
              Design my room now
            </a>
          </td>
        </tr>

        <!-- Need more credits -->
        <tr>
          <td align="center" style="padding:20px 0 0;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.25);">
              Need more generations?
              <a href="${APP_URL}/Pricing" style="color:#6EC6C6;text-decoration:none;font-weight:600;">View plans →</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:36px 0 0;border-top:1px solid rgba(255,255,255,0.06);margin-top:36px;">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.18);">
              © 2026 AmbientSpace.ai · All rights reserved
            </p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.18);">
              Questions? <a href="mailto:support@ambientspace.ai" style="color:rgba(255,255,255,0.35);text-decoration:none;">support@ambientspace.ai</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
