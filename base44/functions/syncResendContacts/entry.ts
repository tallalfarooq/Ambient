import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const AUDIENCE_NAME  = "AmbientSpace Users";

async function getOrCreateAudience() {
  // List existing audiences
  const listRes = await fetch("https://api.resend.com/audiences", {
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}` },
  });
  const { data: audiences } = await listRes.json();
  const existing = audiences?.find((a) => a.name === AUDIENCE_NAME);
  if (existing) return existing.id;

  // Create audience
  const createRes = await fetch("https://api.resend.com/audiences", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: AUDIENCE_NAME }),
  });
  const created = await createRes.json();
  return created.id;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const audienceId = await getOrCreateAudience();
  if (!audienceId) return Response.json({ error: "Could not get/create Resend audience" }, { status: 500 });

  // Fetch all users with credits
  const allCredits = await base44.asServiceRole.entities.UserCredits.list("-created_date", 1000);
  const allUsers   = await base44.asServiceRole.entities.User.list("-created_date", 1000);

  // Build email → name map
  const nameMap = {};
  for (const u of allUsers) nameMap[u.email] = u.full_name || "";

  let synced = 0, failed = 0;

  for (const uc of allCredits) {
    const nameParts = (nameMap[uc.user_email] || "").split(" ");
    // Do NOT include unsubscribed field — omitting it preserves the
    // contact's existing opt-out status in Resend (GDPR compliance).
    // Only set unsubscribed: false on brand-new contacts (Resend default).
    const body = {
      email:      uc.user_email,
      first_name: nameParts[0] || "",
      last_name:  nameParts.slice(1).join(" ") || "",
    };

    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) synced++; else failed++;
  }

  console.log(`[syncResendContacts] audienceId=${audienceId} synced=${synced} failed=${failed}`);
  return Response.json({ audienceId, synced, failed, total: allCredits.length });
});