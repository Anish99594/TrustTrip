import { useState, useEffect } from 'react';
import './styles/WalletStyles.css';
import { FaWallet, FaMoneyBillWave, FaHistory, FaPlus, FaExchangeAlt } from 'react-icons/fa';

const WalletBalance = ({ walletAddress }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchWalletInfo();
    }
  }, [walletAddress]);

  const fetchWalletInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if wallet exists
      const response = await fetch(`/api/wallet/${walletAddress}`);
      const data = await response.json();
      
      if (!response.ok) {
        // If wallet doesn't exist, create it
        if (response.status === 404) {
          await createWallet();
        } else {
          throw new Error(data.message || 'Failed to fetch wallet information');
        }
      } else {
        setWallet(data.wallet);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
          initialBalance: 1000, // Default initial balance
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create wallet');
      }
      
      setWallet(data.wallet);
      fetchTransactions();
    } catch (error) {
      console.error('Error creating wallet:', error);
      setError(error.message);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/wallet/${walletAddress}/transactions`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
      
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
    }
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    setIsAddingFunds(true);
    setError(null);
    
    try {
      const amount = parseFloat(addFundsAmount);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      const response = await fetch(`/api/wallet/${walletAddress}/add-funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add funds');
      }
      
      setWallet(data.wallet);
      setAddFundsAmount('');
      setShowAddFunds(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error adding funds:', error);
      setError(error.message);
    } finally {
      setIsAddingFunds(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading && !wallet) {
    return (
      <div className="wallet-balance-card">
        <div className="loading-spinner">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="wallet-balance-card">
      <div className="wallet-header">
        <div className="wallet-icon">
          <FaWallet />
        </div>
        <h3>Wallet Balance</h3>
      </div>

      {error && (
        <div className="wallet-error">
          <p>{error}</p>
          <button onClick={fetchWalletInfo} className="btn btn-small">Retry</button>
        </div>
      )}

      {wallet && (
        <>
          <div className="wallet-balance">
            <span className="balance-label">Available Balance</span>
            <span className="balance-amount">{wallet.balance.toFixed(8)} CHEQ</span>
            <button 
              className="add-funds-btn"
              onClick={() => setShowAddFunds(!showAddFunds)}
            >
              <FaPlus /> Add Funds
            </button>
          </div>

          {showAddFunds && (
            <form className="add-funds-form" onSubmit={handleAddFunds}>
              <div className="form-group">
                <label>Amount to Add (CHEQ)</label>
                <input
                  type="number"
                  min="0.00001"
                  step="0.00001"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isAddingFunds}
              >
                {isAddingFunds ? 'Processing...' : 'Add Funds'}
              </button>
            </form>
          )}

          <div className="wallet-address">
            <span className="address-label">Wallet Address</span>
            <span className="address-value">
              {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}
            </span>
          </div>

          <div className="transactions-section">
            <h4>
              <FaHistory /> Recent Transactions
            </h4>
            
            {transactions.length === 0 ? (
              <p className="no-transactions">No transactions yet</p>
            ) : (
              <div className="transactions-list">
                {transactions.slice(0, 5).map((tx, index) => (
                  <div key={index} className={`transaction-item ${tx.amount < 0 ? 'payment' : 'deposit'}`}>
                    <div className="transaction-icon">
                      {tx.amount < 0 ? <FaExchangeAlt /> : <FaMoneyBillWave />}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-type">
                        {tx.type === 'payment' ? 'Payment' : 'Deposit'}
                      </div>
                      <div className="transaction-description">
                        {tx.description || (tx.type === 'deposit' ? 'Added funds' : 'Payment')}
                      </div>
                      <div className="transaction-date">
                        {formatDate(tx.timestamp)}
                      </div>
                    </div>
                    <div className="transaction-amount">
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(8)} CHEQ
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WalletBalance;
