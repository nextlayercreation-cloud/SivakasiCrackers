const express = require('express');
const router = express.Router();

const { getGST, setGST } = require('../data/gst');

router.get('/gst', (req, res) => {
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