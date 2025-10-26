import { useState, useEffect } from 'react';
import StockList from './StockList';
import Portfolio from './Portfolio';

function Dashboard({ user, token, onLogout, onUpdateUser }) {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState({ portfolios: [], balance: user?.balance || 0 });
  const [loading, setLoading] = useState(true);

  const API_URL = '/api';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_URL = `${protocol}//${window.location.hostname}:3001`;

  useEffect(() => {
    fetchPortfolio();

    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'stock_update') {
        setStocks(message.data);
        setLoading(false);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      fetchStocks();
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${API_URL}/stocks`);
      const data = await response.json();
      setStocks(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_URL}/portfolio`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPortfolio(data);
      onUpdateUser({ ...user, balance: data.balance });
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  const handleTrade = async (symbol, quantity, type) => {
    try {
      const endpoint = type === 'buy' ? `${API_URL}/portfolio/buy` : `${API_URL}/portfolio/sell`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol, quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Trade failed');
      }

      await fetchPortfolio();
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  if (loading) {
    return <div className="loading">Loading market data...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Welcome, {user?.username}!</h2>
          <div className="balance">
            Balance: ${portfolio.balance?.toFixed(2)}
          </div>
        </div>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        <StockList stocks={stocks} onTrade={handleTrade} />
        <Portfolio portfolio={portfolio.portfolios} stocks={stocks} onTrade={handleTrade} />
      </div>
    </div>
  );
}

export default Dashboard;
