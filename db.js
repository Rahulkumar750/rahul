import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(path.join(__dirname, 'trading.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    balance REAL DEFAULT 10000.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    base_price REAL NOT NULL,
    current_price REAL NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    average_price REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    UNIQUE(user_id, stock_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id)
  );
`);

const initStocks = db.prepare(`
  INSERT OR IGNORE INTO stocks (symbol, name, base_price, current_price) VALUES (?, ?, ?, ?)
`);

const stockData = [
  ['AAPL', 'Apple Inc.', 175.50, 175.50],
  ['GOOGL', 'Alphabet Inc.', 140.25, 140.25],
  ['MSFT', 'Microsoft Corporation', 380.75, 380.75],
  ['AMZN', 'Amazon.com Inc.', 145.30, 145.30],
  ['TSLA', 'Tesla Inc.', 242.80, 242.80],
  ['META', 'Meta Platforms Inc.', 485.60, 485.60],
  ['NVDA', 'NVIDIA Corporation', 495.20, 495.20],
  ['NFLX', 'Netflix Inc.', 445.90, 445.90],
];

stockData.forEach(stock => {
  initStocks.run(...stock);
});

export default db;
