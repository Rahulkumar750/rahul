import { useState } from 'react';

function TradeModal({ stock, type, onClose, onConfirm, maxQuantity }) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = stock.current_price * quantity;

  const handleQuantityChange = (value) => {
    const newQuantity = Math.max(1, value);
    if (maxQuantity && newQuantity > maxQuantity) {
      setQuantity(maxQuantity);
    } else {
      setQuantity(newQuantity);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setLoading(true);

    const result = await onConfirm(quantity);
    
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{type === 'buy' ? 'Buy' : 'Sell'} {stock.symbol}</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="stock-detail">
            <p><strong>Stock:</strong> {stock.name}</p>
            <p><strong>Current Price:</strong> ${stock.current_price.toFixed(2)}</p>
            {maxQuantity && <p><strong>Available:</strong> {maxQuantity} shares</p>}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="quantity-input">
            <button onClick={() => handleQuantityChange(quantity - 1)}>−</button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              min="1"
              max={maxQuantity || undefined}
            />
            <button onClick={() => handleQuantityChange(quantity + 1)}>+</button>
          </div>

          <div className="total-cost">
            <p>Total {type === 'buy' ? 'Cost' : 'Revenue'}</p>
            <div className="total-amount">${total.toFixed(2)}</div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`confirm-button ${type}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Confirm ${type === 'buy' ? 'Purchase' : 'Sale'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeModal;
