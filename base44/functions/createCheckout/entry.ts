import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PLANS = {
  basic: { amount: 500,  currency: "eur", name: "AmbientSpace Basic — 20 Credits", credits: 20,  plan_type: "basic" },
  pro:   { amount: 2000, currency: "eur", name: "AmbientSpace Pro — 100 Credits",  credits: 100, plan_type: "pro"   },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, returnUrl } = await req.json();
    const planConfig = PLANS[plan];
    if (!planConfig) return Response.json({ error: "Invalid plan" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: planConfig.currency,
          product_data: { name: planConfig.name },
          unit_amount: planConfig.amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${returnUrl}?payment=success`,
      cancel_url:  `${returnUrl}?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email:    user.email,
        plan_type:     planConfig.plan_type,
        credits:       String(planConfig.credits),
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("createCheckout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});