import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    // 1. Decode Pub/Sub notification
    const decoded = JSON.parse(atob(body.data.message.data));
    const currentHistoryId = String(decoded.historyId);

    console.log('Gmail notification received:', { currentHistoryId });

    // 2. Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // 3. Load previous historyId from sync-state entity
    const existing = await base44.asServiceRole.entities.SyncState.list();
    const syncRecord = existing.length > 0 ? existing[0] : null;

    if (!syncRecord) {
      // First run: save current historyId as baseline
      await base44.asServiceRole.entities.SyncState.create({ history_id: currentHistoryId });
      console.log('Initialized with historyId:', currentHistoryId);
      return Response.json({ status: 'initialized' });
    }

    // 4. Fetch changes since last known historyId
    const prevHistoryId = syncRecord.history_id;
    const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${prevHistoryId}&historyTypes=messageAdded`;
    const historyRes = await fetch(historyUrl, { headers: authHeader });
    
    if (!historyRes.ok) {
      console.error('History fetch failed:', await historyRes.text());
      return Response.json({ status: 'history_error' }, { status: 500 });
    }

    const historyData = await historyRes.json();

    // 5. Process new messages
    let processedCount = 0;
    if (historyData.history) {
      for (const record of historyData.history) {
        if (record.messagesAdded) {
          for (const { message } of record.messagesAdded) {
            // Fetch full message details
            const msgRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
              { headers: authHeader }
            );
            
            if (!msgRes.ok) continue;
            const msg = await msgRes.json();

            // Check if this is a Stripe payment success email
            const subject = msg.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
            const from = msg.payload?.headers?.find(h => h.name === 'From')?.value || '';

            // Filter for Stripe payment receipts
            if (from.includes('stripe.com') && 
                (subject.toLowerCase().includes('payment') || 
                 subject.toLowerCase().includes('receipt') || 
                 subject.toLowerCase().includes('successful'))) {
              
              console.log('Stripe payment email detected:', { subject, from, messageId: message.id });
              
              // You can add custom logic here, e.g.:
              // - Parse email body for transaction details
              // - Send notifications
              // - Update analytics
              
              processedCount++;
            }
          }
        }
      }
    }

    // 6. Update stored historyId
    await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { 
      history_id: currentHistoryId 
    });

    console.log(`Processed ${processedCount} Stripe payment emails`);
    return Response.json({ status: 'success', processed: processedCount });

  } catch (error) {
    console.error('Gmail webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});