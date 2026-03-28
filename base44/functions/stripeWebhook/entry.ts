import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    if (webhookSecret) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session   = event.data.object;
    const userEmail = session.metadata?.user_email;
    const planType  = session.metadata?.plan_type;
    const credits   = parseInt(session.metadata?.credits || "0");

    if (!userEmail || !credits) {
      console.error("Missing metadata in session:", session.id);
      return new Response("Missing metadata", { status: 400 });
    }

    try {
      const base44 = createClientFromRequest(req);
      const existing = await base44.asServiceRole.entities.UserCredits.filter({ user_email: userEmail });

      if (existing.length > 0) {
        const current = existing[0];
        await base44.asServiceRole.entities.UserCredits.update(current.id, {
          credits_remaining: current.credits_remaining + credits,
          plan_type:         planType,
          total_purchased:   (current.total_purchased || 0) + credits,
          last_purchase_date: new Date().toISOString(),
        });
        console.log(`Updated credits for ${userEmail}: +${credits} credits`);
      } else {
        await base44.asServiceRole.entities.UserCredits.create({
          user_email:         userEmail,
          credits_remaining:  credits,
          plan_type:          planType,
          total_purchased:    credits,
          last_purchase_date: new Date().toISOString(),
        });
        console.log(`Created credits for ${userEmail}: ${credits} credits`);
      }
    } catch (err) {
      console.error("DB update error:", err.message);
      return new Response("DB error", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});