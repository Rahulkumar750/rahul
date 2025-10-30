import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ Enable JWT authentication for all portfolio routes
router.use(authenticateToken);

// ✅ Helper function to get the authenticated user's ID
function getUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  throw new Error('User not authenticated');
}

// ✅ GET /api/portfolio - Fetch user's portfolio and balance
router.get('/', (req, res) => {
  try {
    const userId = getUserId(req);

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
    res.status(401).json({ error: error.message });
  }
});

// ✅ POST /api/portfolio/buy - Buy stocks
router.post('/buy', (req, res) => {
  try {
    const userId = getUserId(req);
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid symbol or quantity' });
    }

    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(symbol);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const totalCost = stock.current_price * quantity;
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

    if (!user || user.balance < totalCost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct balance
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(totalCost, userId);

    const existingPortfolio = db.prepare(
      'SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ?'
    ).get(userId, stock.id);

    if (existingPortfolio) {
      const newQuantity = existingPortfolio.quantity + quantity;
      const newAveragePrice = (
        (existingPortfolio.average_price * existingPortfolio.quantity) + totalCost
      ) / newQuantity;

      db.prepare('UPDATE portfolios SET quantity = ?, average_price = ? WHERE id = ?')
        .run(newQuantity, newAveragePrice, existingPortfolio.id);
    } else {
      db.prepare('INSERT INTO portfolios (user_id, stock_id, symbol, quantity, average_price) VALUES (?, ?, ?, ?, ?)')
        .run(userId, stock.id, symbol, quantity, stock.current_price);
    }

    db.prepare(
      'INSERT INTO transactions (user_id, stock_id, symbol, type, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, stock.id, symbol, 'BUY', quantity, stock.current_price, totalCost);

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

// ✅ POST /api/portfolio/sell - Sell stocks
router.post('/sell', (req, res) => {
  try {
    const userId = getUserId(req);
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid symbol or quantity' });
    }

    const stock = db.prepare('SELECT * FROM stocks WHERE symbol = ?').get(symbol);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const portfolio = db.prepare(
      'SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ?'
    ).get(userId, stock.id);

    if (!portfolio || portfolio.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient shares to sell' });
    }

    const totalRevenue = stock.current_price * quantity;

    // Update balance
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalRevenue, userId);

    // Update or remove portfolio entry
    if (portfolio.quantity === quantity) {
      db.prepare('DELETE FROM portfolios WHERE id = ?').run(portfolio.id);
    } else {
      db.prepare('UPDATE portfolios SET quantity = quantity - ? WHERE id = ?')
        .run(quantity, portfolio.id);
    }

    db.prepare(
      'INSERT INTO transactions (user_id, stock_id, symbol, type, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, stock.id, symbol, 'SELL', quantity, stock.current_price, totalRevenue);

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

// ✅ GET /api/portfolio/transactions - Fetch user's transaction history
router.get('/transactions', (req, res) => {
  try {
    const userId = getUserId(req);
    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(userId);
    res.json(transactions || []);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
