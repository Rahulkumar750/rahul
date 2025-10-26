import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Optional: Use authentication. Comment out for testing without tokens
// router.use(authenticateToken);

// Helper to get user ID safely
function getUserId(req) {
  // If authentication is enabled, use req.user.id
  if (req.user && req.user.id) return req.user.id;
  // Otherwise, return a default test user ID
  return 1;
}

// GET /api/portfolio
router.get('/', (req, res) => {
  const userId = getUserId(req);

  try {
    const portfolios = db.prepare(`
      SELECT p.*, s.name, s.current_price,
             (s.current_price - p.average_price) * p.quantity AS profit_loss,
             ((s.current_price - p.average_price) / p.average_price * 100) AS profit_loss_percent
      FROM portfolios p
      JOIN stocks s ON p.stock_id = s.id
      WHERE p.user_id = ?
    `).all(userId);

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    res.json({
      portfolios: portfolios || [],
      balance: user ? user.balance : 0
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio/buy
router.post('/buy', (req, res) => {
  const userId = getUserId(req);
  const { symbol, quantity } = req.body;

  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid symbol or quantity' });
  }

  try {
    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(symbol);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const totalCost = stock.current_price * quantity;
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    if (!user || user.balance < totalCost) return res.status(400).json({ error: 'Insufficient balance' });

    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(totalCost, userId);

    const existingPortfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ?')
      .get(userId, stock.id);

    if (existingPortfolio) {
      const newQuantity = existingPortfolio.quantity + quantity;
      const newAveragePrice = ((existingPortfolio.average_price * existingPortfolio.quantity) + totalCost) / newQuantity;
      db.prepare('UPDATE portfolios SET quantity = ?, average_price = ? WHERE id = ?')
        .run(newQuantity, newAveragePrice, existingPortfolio.id);
    } else {
      db.prepare('INSERT INTO portfolios (user_id, stock_id, symbol, quantity, average_price) VALUES (?, ?, ?, ?, ?)')
        .run(userId, stock.id, symbol, quantity, stock.current_price);
    }

    db.prepare('INSERT INTO transactions (user_id, stock_id, symbol, type, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, stock.id, symbol, 'BUY', quantity, stock.current_price, totalCost);

    const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    res.json({
      message: 'Stock purchased successfully',
      balance: updatedUser ? updatedUser.balance : 0,
      transaction: { symbol, type: 'BUY', quantity, price: stock.current_price, total: totalCost }
    });

  } catch (error) {
    console.error('Buy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio/sell
router.post('/sell', (req, res) => {
  const userId = getUserId(req);
  const { symbol, quantity } = req.body;

  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid symbol or quantity' });
  }

  try {
    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(symbol);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const portfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ?')
      .get(userId, stock.id);

    if (!portfolio || portfolio.quantity < quantity) return res.status(400).json({ error: 'Insufficient shares to sell' });

    const totalRevenue = stock.current_price * quantity;
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalRevenue, userId);

    if (portfolio.quantity === quantity) {
      db.prepare('DELETE FROM portfolios WHERE id = ?').run(portfolio.id);
    } else {
      db.prepare('UPDATE portfolios SET quantity = quantity - ? WHERE id = ?').run(quantity, portfolio.id);
    }

    db.prepare('INSERT INTO transactions (user_id, stock_id, symbol, type, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, stock.id, symbol, 'SELL', quantity, stock.current_price, totalRevenue);

    const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    res.json({
      message: 'Stock sold successfully',
      balance: updatedUser ? updatedUser.balance : 0,
      transaction: { symbol, type: 'SELL', quantity, price: stock.current_price, total: totalRevenue }
    });

  } catch (error) {
    console.error('Sell error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/transactions
router.get('/transactions', (req, res) => {
  const userId = getUserId(req);

  try {
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(userId);
    res.json(transactions || []);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
