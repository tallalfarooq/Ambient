import Stripe from 'npm:stripe';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userEmail = session.metadata.user_email;
    const appId = session.metadata.base44_app_id;

    // Create Base44 client with app ID from session metadata
    const headers = new Headers(req.headers);
    headers.set('Base44-App-Id', appId);
    const modifiedReq = new Request(req.url, {
      method: req.method,
      headers: headers,
    });
    const base44 = createClientFromRequest(modifiedReq);

    try {
      const planType = session.metadata.plan_type;
      const creditsToAdd = parseInt(session.metadata.credits || '0');

      if (!planType || !creditsToAdd) {
        console.error('Missing plan metadata');
        return Response.json({ error: 'Missing plan metadata' }, { status: 400 });
      }

      const existingCredits = await base44.asServiceRole.entities.UserCredits.filter({
        user_email: userEmail
      });

      if (existingCredits.length > 0) {
        const current = existingCredits[0];
        await base44.asServiceRole.entities.UserCredits.update(current.id, {
          credits_remaining: current.credits_remaining + creditsToAdd,
          plan_type: planType,
          total_purchased: current.total_purchased + creditsToAdd,
          last_purchase_date: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.UserCredits.create({
          user_email: userEmail,
          credits_remaining: creditsToAdd,
          plan_type: planType,
          total_purchased: creditsToAdd,
          last_purchase_date: new Date().toISOString(),
        });
      }

      console.log(`Added ${creditsToAdd} credits (${planType} plan) for ${userEmail}`);
    } catch (error) {
      console.error('Error updating credits:', error);
      return Response.json({ error: 'Failed to update credits' }, { status: 500 });
    }
  }

  return Response.json({ received: true });
});