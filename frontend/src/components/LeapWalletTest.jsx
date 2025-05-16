import { useState, useEffect } from 'react';

const LeapWalletTest = () => {
  const [walletStatus, setWalletStatus] = useState({
    installed: false,
    connected: false,
    address: null,
    error: null
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Initial check
    checkWalletInstallation();
    
    // Set up interval to check for wallet installation
    // Use a longer interval to reduce console spam
    const intervalId = setInterval(checkWalletInstallation, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  const checkWalletInstallation = () => {
    const isInstalled = !!window.leap;
    
    // Only log if the installation status has changed
    if (isInstalled !== walletStatus.installed) {
      addLog(`Leap wallet ${isInstalled ? 'is' : 'is not'} installed`);
      
      setWalletStatus(prev => ({
        ...prev,
        installed: isInstalled
      }));
      
      if (isInstalled) {
        checkWalletConnection();
      }
    }
  };

  const checkWalletConnection = async () => {
    try {
      if (!window.leap) return;
      
      addLog('Checking wallet connection...');
      
      const key = await window.leap.getKey('cheqd-testnet-6').catch(err => {
        addLog(`Error getting key: ${err.message}`);
        return null;
      });
      
      if (key && key.bech32Address) {
        addLog(`Connected to wallet: ${key.bech32Address}`);
        setWalletStatus(prev => ({
          ...prev,
          connected: true,
          address: key.bech32Address,
          error: null
        }));
      } else {
        addLog('No wallet address found');
        setWalletStatus(prev => ({
          ...prev,
          connected: false,
          address: null
        }));
      }
    } catch (error) {
      addLog(`Error checking connection: ${error.message}`);
      setWalletStatus(prev => ({
        ...prev,
        error: error.message
      }));
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    addLog('Connecting to wallet...');
    
    try {
      if (!window.leap) {
        throw new Error('Leap wallet not installed');
      }
      
      addLog('Enabling wallet...');
      try {
        await window.leap.enable('cheqd-testnet-6');
        addLog('Wallet enabled successfully');
      } catch (error) {
        addLog(`Enable error: ${error.message}`);
        
        if (error.message.includes('chain')) {
          addLog('Suggesting testnet...');
          await suggestCheqdTestnet();
          addLog('Trying to enable again...');
          await window.leap.enable('cheqd-testnet-6');
          addLog('Wallet enabled after suggesting chain');
        } else {
          throw error;
        }
      }
      
      addLog('Getting wallet key...');
      const key = await window.leap.getKey('cheqd-testnet-6');
      
      if (!key) {
        throw new Error('Failed to get wallet key');
      }
      
      const address = key.bech32Address;
      addLog(`Got wallet address: ${address}`);
      
      setWalletStatus({
        installed: true,
        connected: true,
        address,
        error: null
      });
    } catch (error) {
      addLog(`Connection error: ${error.message}`);
      setWalletStatus(prev => ({
        ...prev,
        error: error.message
      }));
    } finally {
      setIsConnecting(false);
    }
  };

  const suggestCheqdTestnet = async () => {
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
    
    try {
      addLog('Suggesting cheqd testnet chain...');
      await window.leap.experimentalSuggestChain(testnetConfig);
      addLog('Chain suggested successfully');
    } catch (error) {
      addLog(`Error suggesting chain: ${error.message}`);
      throw error;
    }
  };

  return (
    <div className="leap-wallet-test" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Leap Wallet Test</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h3>Wallet Status</h3>
        <p><strong>Installed:</strong> {walletStatus.installed ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Connected:</strong> {walletStatus.connected ? '✅ Yes' : '❌ No'}</p>
        {walletStatus.address && (
          <p><strong>Address:</strong> {walletStatus.address}</p>
        )}
        {walletStatus.error && (
          <p style={{ color: 'red' }}><strong>Error:</strong> {walletStatus.error}</p>
        )}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={connectWallet} 
          disabled={isConnecting || !walletStatus.installed || walletStatus.connected}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isConnecting || !walletStatus.installed || walletStatus.connected ? 'not-allowed' : 'pointer',
            opacity: isConnecting || !walletStatus.installed || walletStatus.connected ? 0.7 : 1
          }}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        
        <button 
          onClick={checkWalletInstallation} 
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Refresh Status
        </button>
      </div>
      
      <div>
        <h3>Connection Logs</h3>
        <div style={{ 
          height: '300px', 
          overflowY: 'auto', 
          padding: '10px', 
          border: '1px solid #ddd', 
          borderRadius: '5px',
          backgroundColor: '#f5f5f5',
          fontFamily: 'monospace'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeapWalletTest;
