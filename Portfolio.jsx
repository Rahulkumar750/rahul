import { useState } from 'react';
import TradeModal from './TradeModal';

function Portfolio({ portfolio, stocks, onTrade }) {
  const [selectedStock, setSelectedStock] = useState(null);

  const handleOpenModal = (portfolioItem) => {
    const stock = stocks.find(s => s.id === portfolioItem.stock_id);
    if (stock) {
      setSelectedStock({ ...stock, maxQuantity: portfolioItem.quantity });
    }
  };

  const handleCloseModal = () => {
    setSelectedStock(null);
  };

  const handleConfirmTrade = async (quantity) => {
    const result = await onTrade(selectedStock.symbol, quantity, 'sell');
    if (result.success) {
      handleCloseModal();
    }
    return result;
  };

  const totalValue = portfolio.reduce((sum, item) => {
    return sum + (item.current_price * item.quantity);
  }, 0);

  const totalProfitLoss = portfolio.reduce((sum, item) => {
    return sum + item.profit_loss;
  }, 0);

  const totalCostBasis = totalValue - totalProfitLoss;
  const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

  return (
    <div className="portfolio-section">
      <h2 className="section-title">💼 My Portfolio</h2>

      {portfolio.length > 0 && (
        <div className="portfolio-summary" style={{
          background: '#f0f0f0',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Total Value:</strong> ${totalValue.toFixed(2)}
          </div>
          <div className={totalProfitLoss >= 0 ? 'profit' : 'loss'}>
            <strong>Total P/L:</strong> ${totalProfitLoss.toFixed(2)} ({totalProfitLossPercent.toFixed(2)}%)
          </div>
        </div>
      )}

      <div className="portfolio-list">
        {portfolio.length === 0 ? (
          <div className="empty-state">
            <p>No stocks in your portfolio yet.</p>
            <p>Start trading to build your portfolio!</p>
          </div>
        ) : (
          portfolio.map((item) => (
            <div key={item.id} className="portfolio-item">
              <div className="portfolio-header">
                <div>
                  <div className="stock-symbol">{item.symbol}</div>
                  <div className="stock-name">{item.name}</div>
                </div>
                <button className="sell-button" onClick={() => handleOpenModal(item)}>
                  Sell
                </button>
              </div>
              <div className="portfolio-details">
                <div className="detail-item">
                  <span className="detail-label">Quantity</span>
                  <span className="detail-value">{item.quantity}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Avg Price</span>
                  <span className="detail-value">${item.average_price.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Price</span>
                  <span className="detail-value">${item.current_price.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">P/L</span>
                  <span className={`detail-value ${item.profit_loss >= 0 ? 'profit' : 'loss'}`}>
                    ${item.profit_loss.toFixed(2)} ({item.profit_loss_percent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedStock && (
        <TradeModal
          stock={selectedStock}
          type="sell"
          onClose={handleCloseModal}
          onConfirm={handleConfirmTrade}
          maxQuantity={selectedStock.maxQuantity}
        />
      )}
    </div>
  );
}

export default Portfolio;
