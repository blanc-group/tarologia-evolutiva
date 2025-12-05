module.exports = async (req, res) => {
  // Test semplice senza Stripe per verificare che l'API funzioni
  res.status(200).json({ 
    status: "API funzionante",
    method: req.method,
    test: true,
    timestamp: new Date().toISOString()
  });
};
