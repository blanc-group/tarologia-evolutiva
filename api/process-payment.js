module.exports = async (req, res) => {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gestisci OPTIONS per CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo POST permesso
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Inizializza Stripe solo quando serve
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const { payment_method_id, amount, currency, name, email, description } = req.body;

    // Crea il PaymentIntent
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
      try {
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
      } catch (webhookError) {
        console.log('Webhook error (non bloccante):', webhookError);
      }

      return res.status(200).json({ 
        success: true,
        payment_id: paymentIntent.id
      });
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Il pagamento richiede ulteriore verifica'
      });
    }

  } catch (error) {
    console.error('Errore:', error);
    return res.status(400).json({ 
      success: false,
      error: error.message || 'Errore nel processamento del pagamento'
    });
  }
};
```

### **COMMIT il file con messaggio:** "Ripristino codice Stripe con correzioni"

---

## ✅ **DOPO IL DEPLOY, TESTA:**
```
https://tarologia-evolutiva.vercel.app/api/process-payment
