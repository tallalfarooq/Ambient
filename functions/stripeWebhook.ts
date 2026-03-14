import Stripe from 'npm:stripe';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
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

    try {
      const existingCredits = await base44.asServiceRole.entities.UserCredits.filter({
        user_email: userEmail
      });

      if (existingCredits.length > 0) {
        const current = existingCredits[0];
        await base44.asServiceRole.entities.UserCredits.update(current.id, {
          credits_remaining: current.credits_remaining + 10,
          total_purchased: current.total_purchased + 10,
          last_purchase_date: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.UserCredits.create({
          user_email: userEmail,
          credits_remaining: 11,
          total_purchased: 10,
          last_purchase_date: new Date().toISOString(),
        });
      }

      console.log(`Added 10 credits for ${userEmail}`);
    } catch (error) {
      console.error('Error updating credits:', error);
      return Response.json({ error: 'Failed to update credits' }, { status: 500 });
    }
  }

  return Response.json({ received: true });
});