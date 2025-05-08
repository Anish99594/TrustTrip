import { useState, useEffect } from 'react';

const WalletConnect = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.leap) {
      setWalletInstalled(true);
    } else {
      setWalletInstalled(false);
      console.log('Leap Wallet not installed');
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
      await window.leap.experimentalSuggestChain(testnetConfig);
      console.log('cheqd testnet suggested successfully');
    } catch (error) {
      console.error('Failed to suggest cheqd testnet:', error);
      throw error;
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.leap) {
        throw new Error('Leap Wallet not detected. Please install it.');
      }

      console.log('Attempting to enable cheqd-testnet-6');
      await window.leap.enable('cheqd-testnet-6').catch(async (error) => {
        if (error.message.includes('chain')) {
          console.log('Chain not found, suggesting cheqd testnet');
          await suggestCheqdTestnet();
          await window.leap.enable('cheqd-testnet-6');
        } else {
          throw error;
        }
      });

      console.log('Fetching wallet key');
      const key = await window.leap.getKey('cheqd-testnet-6');
      const address = key.bech32Address;

      console.log('Wallet connected:', address);
      onConnect(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="card wallet-connect">
      <h2 className="card-title">Connect Your Wallet</h2>
      <p>To use the Trustworthy AI Travel Agent, please connect your Leap Wallet with cheqd testnet.</p>

      {!walletInstalled && (
        <div className="wallet-warning">
          <p>⚠️ Leap Wallet not detected. Please install the Leap Wallet extension first.</p>
          <a
            href="https://www.leapwallet.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            Get Leap Wallet
          </a>
        </div>
      )}

      {error && (
        <div className="wallet-error" style={{ color: 'red', margin: '1rem 0' }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      <div style={{ margin: '2rem 0' }}>
        <button
          className="btn btn-primary btn-block"
          onClick={connectWallet}
          disabled={isConnecting || !walletInstalled}
        >
          {isConnecting ? (
            <>
              <span className="spinner"></span>
              Connecting...
            </>
          ) : (
            'Connect Leap Wallet'
          )}
        </button>
      </div>

      <div style={{ fontSize: '0.875rem', color: '#666' }}>
        <p>This app uses cheqd technology for:</p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>Secure identity verification</li>
          <li>Trusted provider verification</li>
          <li>Secure storage of your travel preferences</li>
        </ul>
      </div>
    </div>
  );
};

export default WalletConnect;