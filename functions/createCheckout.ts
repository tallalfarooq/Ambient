import Stripe from 'npm:stripe';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLANS = {
  basic: { price: 'price_basic_placeholder', credits: 20, amount: 500 },
  pro: { price: 'price_pro_placeholder', credits: 100, amount: 2000 }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();
    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const { origin } = new URL(req.url);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              description: `${selectedPlan.credits} credits (${Math.floor(selectedPlan.credits / 2)} AI generations)`,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/Studio?payment=success`,
      cancel_url: `${origin}/Pricing?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        plan_type: plan,
        credits: selectedPlan.credits.toString(),
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});