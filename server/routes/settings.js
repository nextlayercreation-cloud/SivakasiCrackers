const express = require('express');
const router = express.Router();
console.log("settings.js loaded");
const { getGST, setGST } = require('../data/gst');

router.get('/gst', (req, res) => {
  console.log("GST ROUTE HIT");
  res.json({
    gstPercentage: getGST()
  });
});

router.put('/gst', (req, res) => {
  const { gstPercentage } = req.body;

  res.json(
    setGST(gstPercentage)
  );
});

module.exports = router;