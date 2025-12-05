// api/process-payment.js
// VERCEL SERVERLESS FUNCTION PER STRIPE

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Abilita CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  // Gestisci preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ headers });
  }

  // Solo POST permesso
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_method_id, amount, currency, name, email, description } = req.body;

    // Crea il PaymentIntent con Stripe
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

    // Se il pagamento è riuscito
    if (paymentIntent.status === 'succeeded') {
      // Notifica GoHighLevel
      await fetch('https://services.leadconnectorhq.com/hooks/LqJGewM4EtqlT6hnBdc6/webhook-trigger/11184b57-a39a-4e34-b44f-9e087bec9661', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Rispondi con successo
      res.status(200).json({ 
        success: true,
        payment_id: paymentIntent.id
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: 'Il pagamento richiede un\'ulteriore verifica'
      });
    }

  } catch (error) {
    console.error('Errore pagamento:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Errore nel processamento del pagamento'
    });
  }
};
