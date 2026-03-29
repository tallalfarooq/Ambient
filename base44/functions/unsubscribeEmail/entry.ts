import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const AUDIENCE_NAME  = "AmbientSpace Users";

async function getAudienceId(): Promise<string | null> {
  const res = await fetch("https://api.resend.com/audiences", {
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}` },
  });
  const { data: audiences } = await res.json();
  return audiences?.find((a: { name: string; id: string }) => a.name === AUDIENCE_NAME)?.id ?? null;
}

Deno.serve(async (req) => {
  const { email } = await req.json();
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });

  const audienceId = await getAudienceId();
  if (!audienceId) return Response.json({ error: "Audience not found" }, { status: 404 });

  // Mark contact as unsubscribed in Resend audience
  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: true }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("[unsubscribeEmail] Resend error:", err);
    return Response.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }

  console.log(`[unsubscribeEmail] Unsubscribed: ${email}`);
  return Response.json({ success: true, email });
});
