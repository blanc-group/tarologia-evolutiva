let stripe;

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Inizializza Stripe solo se non già fatto
    if (!stripe) {
      try {
        const Stripe = require('stripe');
        stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      } catch (e) {
        console.error('Errore caricamento Stripe:', e);
        // Fallback senza Stripe
        const { name, email, amount } = req.body;
        
        // Invia a GoHighLevel per processamento manuale
        await fetch('https://services.leadconnectorhq.com/hooks/LqJGewM4EtqlT6hnBdc6/webhook-trigger/11184b57-a39a-4e34-b44f-9e087bec9661', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_status: 'pending_manual',
            amount: amount / 100,
            customer_name: name,
            customer_email: email,
            product: 'guida-tarocchi',
            timestamp: new Date().toISOString()
          })
        });
        
        return res.status(200).json({ 
          success: true,
          message: 'Ordine ricevuto per processamento manuale'
        });
      }
    }
    
    const { payment_method_id, amount, currency, name, email, description } = req.body;

    // Prova a processare con Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method: payment_method_id,
      confirmation_method: 'automatic',
      confirm: true,
      receipt_email: email,
      description: description,
      metadata: {
        customer_name: name,
        customer_email: email,
        product: 'guida-tarocchi'
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Notifica GoHighLevel
      await fetch('https://services.leadconnectorhq.com/hooks/LqJGewM4EtqlT6hnBdc6/webhook-trigger/11184b57-a39a-4e34-b44f-9e087bec9661', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'completed',
          payment_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          customer_name: name,
          customer_email: email,
          product: 'guida-tarocchi',
          timestamp: new Date().toISOString()
        })
      });

      return res.status(200).json({ 
        success: true,
        payment_id: paymentIntent.id
      });
    }

  } catch (error) {
    console.error('Errore:', error);
    
    // Fallback: invia a GoHighLevel per processamento manuale
    try {
      const { name, email, amount } = req.body;
      await fetch('https://services.leadconnectorhq.com/hooks/LqJGewM4EtqlT6hnBdc6/webhook-trigger/11184b57-a39a-4e34-b44f-9e087bec9661', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'error_manual_required',
          amount: amount / 100,
          customer_name: name,
          customer_email: email,
          error: error.message,
          product: 'guida-tarocchi',
          timestamp: new Date().toISOString()
        })
      });
      
      return res.status(200).json({ 
        success: true,
        message: 'Ordine ricevuto - verrai contattato'
      });
    } catch (webhookError) {
      return res.status(400).json({ 
        success: false,
        error: 'Errore nel processamento'
      });
    }
  }
};
