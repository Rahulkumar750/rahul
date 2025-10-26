import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stocks.js';
import portfolioRoutes from './routes/portfolio.js';
import db from './db.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/portfolio', portfolioRoutes);

function updateStockPrices() {
  const stocks = db.prepare('SELECT * FROM stocks').all();
  
  stocks.forEach(stock => {
    const changePercent = (Math.random() - 0.5) * 0.06;
    const newPrice = stock.current_price * (1 + changePercent);
    
    db.prepare('UPDATE stocks SET current_price = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newPrice, stock.id);
  });

  const updatedStocks = db.prepare('SELECT * FROM stocks').all();
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'stock_update',
        data: updatedStocks
      }));
    }
  });
}

setInterval(updateStockPrices, 1500);

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  const stocks = db.prepare('SELECT * FROM stocks').all();
  ws.send(JSON.stringify({
    type: 'stock_update',
    data: stocks
  }));

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
