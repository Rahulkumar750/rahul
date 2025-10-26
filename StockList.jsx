import { useState } from 'react';
import TradeModal from './TradeModal';

function StockList({ stocks, onTrade }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeType, setTradeType] = useState(null);

  const handleOpenModal = (stock, type) => {
    setSelectedStock(stock);
    setTradeType(type);
  };

  const handleCloseModal = () => {
    setSelectedStock(null);
    setTradeType(null);
  };

  const handleConfirmTrade = async (quantity) => {
    const result = await onTrade(selectedStock.symbol, quantity, tradeType);
    if (result.success) {
      handleCloseModal();
    }
    return result;
  };

  const getRandomChange = (stock) => {
    const change = ((stock.current_price - stock.base_price) / stock.base_price * 100);
    return change;
  };

  return (
    <div className="stocks-section">
      <h2 className="section-title"> Live Stock Market</h2>
      <div className="stock-list">
        {stocks.map((stock) => {
          const change = getRandomChange(stock);
          const isPositive = change >= 0;

          return (
            <div key={stock.id} className="stock-item">
              <div className="stock-info">
                <div className="stock-symbol">{stock.symbol}</div>
                <div className="stock-name">{stock.name}</div>
              </div>
              <div className="stock-price">${stock.current_price.toFixed(2)}</div>
              <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
              </div>
              <div className="stock-actions">
                <button className="buy-button" onClick={() => handleOpenModal(stock, 'buy')}>
                  Buy
                </button>
                <button className="sell-button" onClick={() => handleOpenModal(stock, 'sell')}>
                  Sell
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedStock && (
        <TradeModal
          stock={selectedStock}
          type={tradeType}
          onClose={handleCloseModal}
          onConfirm={handleConfirmTrade}
        />
      )}
    </div>
  );
}

export default StockList;
