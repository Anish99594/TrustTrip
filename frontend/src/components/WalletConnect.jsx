import { useState, useEffect } from 'react';

const WalletConnect = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStep, setConnectionStep] = useState(1);

  useEffect(() => {
    if (window.leap) {
      setWalletInstalled(true);
    } else {
      setWalletInstalled(false);
    }
  }, []);

  const testnetConfig = {
    chainId: 'cheqd-testnet-6',
    chainName: 'cheqd Testnet',
    rpcUrls: ['https://rpc.cheqd.network'],
    rest: 'https://api.cheqd.network',
    bip44: {
      coinType: 118,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'cheqd',
      bech32PrefixAccPub: 'cheqdpub',
      bech32PrefixValAddr: 'cheqdvaloper',
      bech32PrefixValPub: 'cheqdvaloperpub',
      bech32PrefixConsAddr: 'cheqdvalcons',
      bech32PrefixConsPub: 'cheqdvalconspub',
    },
    currencies: [
      {
        coinDenom: 'CHEQ',
        coinMinimalDenom: 'ncheq',
        coinDecimals: 9,
      },
    ],
    feeCurrencies: [
      {
        coinDenom: 'CHEQ',
        coinMinimalDenom: 'ncheq',
        coinDecimals: 9,
        gasPriceStep: {
          low: 0.01,
          average: 0.025,
          high: 0.04,
        },
      },
    ],
    stakeCurrency: {
      coinDenom: 'CHEQ',
      coinMinimalDenom: 'ncheq',
      coinDecimals: 9,
    },
    image: 'https://raw.githubusercontent.com/leapwallet/assets/main/cheqd-logo.png',
    theme: {
      primaryColor: '#fff',
      gradient: 'linear-gradient(180deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 100%)',
    },
  };

  const suggestCheqdTestnet = async () => {
    try {
      setConnectionStep(2);
      await window.leap.experimentalSuggestChain(testnetConfig);
      setConnectionStep(3);
    } catch (error) {
      throw error;
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionStep(1);

    try {
      if (!window.leap) {
        throw new Error('Leap Wallet not detected. Please install it.');
      }

      await window.leap.enable('cheqd-testnet-6').catch(async (error) => {
        if (error.message.includes('chain')) {
          await suggestCheqdTestnet();
          await window.leap.enable('cheqd-testnet-6');
        } else {
          throw error;
        }
      });

      setConnectionStep(4);
      const key = await window.leap.getKey('cheqd-testnet-6');
      const address = key.bech32Address;

      setConnectionStep(5);
      onConnect(address);
    } catch (error) {
      setError(`Failed to connect wallet: ${error.message}`);
      setConnectionStep(0);
    } finally {
      setIsConnecting(false);
    }
  };

  const getStepText = () => {
    switch (connectionStep) {
      case 0:
        return 'Connection failed';
      case 1:
        return 'Initializing connection...';
      case 2:
        return 'Configuring cheqd network...';
      case 3:
        return 'Requesting wallet access...';
      case 4:
        return 'Retrieving credentials...';
      case 5:
        return 'Connection successful!';
      default:
        return 'Connecting...';
    }
  };

  return (
    <div className="card wallet-connect">
      <div className="wallet-connect-header">
        <div className="wallet-icon-container">
          <span className="wallet-large-icon">🔐</span>
        </div>
        <h2 className="card-title">Connect Your Wallet</h2>
        <p className="wallet-subtitle">
          Secure your travel bookings with verifiable credentials
        </p>
      </div>
      <div className="wallet-connect-action">
        <button
          className="btn btn-primary wallet-connect-btn"
          onClick={connectWallet}
          disabled={isConnecting || !walletInstalled}
        >
          {isConnecting ? (
            <>
              <span className="spinner"></span>
              {getStepText()}
            </>
          ) : (
            <>
              <span className="btn-icon">🔗</span>
              Connect Wallet
            </>
          )}
        </button>
      </div>
      {!walletInstalled && (
        <div className="wallet-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4 className="warning-title">Wallet Not Detected</h4>
            <p className="warning-message">
              Please install the Leap Wallet extension to continue.
            </p>
            <a
              href="https://www.leapwallet.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary wallet-install-btn"
            >
              <span className="btn-icon">📲</span>
              Get Leap Wallet
            </a>
          </div>
        </div>
      )}
      {error && (
        <div className="wallet-error">
          <div className="error-icon">⛔</div>
          <div className="error-content">
            <h4 className="error-title">Connection Error</h4>
            <p className="error-message">{error}</p>
          </div>
        </div>
      )}
      <div className="connection-steps">
        {isConnecting && (
          <div className="steps-container">
            <div
              className={`step-item ${connectionStep >= 1 ? 'active' : ''} ${
                connectionStep > 1 ? 'completed' : ''
              }`}
            >
              <div className="step-number">1</div>
              <div className="step-label">Initialize</div>
            </div>
            <div
              className={`step-item ${connectionStep >= 2 ? 'active' : ''} ${
                connectionStep > 2 ? 'completed' : ''
              }`}
            >
              <div className="step-number">2</div>
              <div className="step-label">Configure</div>
            </div>
            <div
              className={`step-item ${connectionStep >= 3 ? 'active' : ''} ${
                connectionStep > 3 ? 'completed' : ''
              }`}
            >
              <div className="step-number">3</div>
              <div className="step-label">Authorize</div>
            </div>
            <div
              className={`step-item ${connectionStep >= 4 ? 'active' : ''} ${
                connectionStep > 4 ? 'completed' : ''
              }`}
            >
              <div className="step-number">4</div>
              <div className="step-label">Verify</div>
            </div>
            <div className={`step-item ${connectionStep >= 5 ? 'active' : ''}`}>
              <div className="step-number">5</div>
              <div className="step-label">Connect</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;