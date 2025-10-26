import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const stocks = db.prepare('SELECT * FROM stocks ORDER BY symbol').all();
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

router.get('/:symbol', (req, res) => {
  try {
    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(req.params.symbol);
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

export default router;
