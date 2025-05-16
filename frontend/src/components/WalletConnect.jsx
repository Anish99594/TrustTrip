import { useState, useEffect } from 'react';
import WalletBalance from './WalletBalance';
import { FaWallet, FaCheckCircle } from 'react-icons/fa';

const WalletConnect = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStep, setConnectionStep] = useState(1);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [showWalletBalance, setShowWalletBalance] = useState(false);

  useEffect(() => {
    // Check if Leap wallet is installed
    const checkWalletInstallation = () => {
      const detected = !!window.leap;
      
      if (detected !== walletInstalled) {
        console.log(detected ? 'Leap wallet detected' : 'Leap wallet not detected');
        setWalletInstalled(detected);
        
        if (detected) {
          checkWalletConnection();
        }
      }
    };
    
    checkWalletInstallation();
    
    const intervalId = setInterval(checkWalletInstallation, 3000);
    return () => clearInterval(intervalId);
  }, [walletInstalled]);

  const checkWalletConnection = async () => {
    try {
      if (window.leap) {
        console.log('Checking wallet connection...');
        const key = await window.leap.getKey('cheqd-testnet-6').catch((err) => {
          console.log('Error getting key:', err.message);
          return null;
        });
        
        if (key && key.bech32Address) {
          console.log('Found wallet address:', key.bech32Address);
          setConnectedAddress(key.bech32Address);
          if (onConnect) {
            onConnect(key.bech32Address);
          }
          console.log('Wallet connected successfully:', key.bech32Address);
        } else {
          console.log('No wallet address found');
        }
      } else {
        console.log('Leap wallet not available for connection check');
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

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
      console.error('Error suggesting chain:', error);
      setError(`Failed to configure network: ${error.message}`);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionStep(1);

    try {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!window.leap && attempts < maxAttempts) {
        console.log(`Waiting for Leap wallet to be available (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!window.leap) {
        console.error('Leap Wallet not detected after waiting');
        throw new Error('Leap Wallet not detected. Please install it and refresh the page.');
      }
      
      console.log('Leap wallet is now available, proceeding with connection');

      console.log('Attempting to enable Leap wallet...');
      try {
        await window.leap.enable('cheqd-testnet-6');
        console.log('Wallet enabled successfully');
      } catch (error) {
        console.log('Enable error:', error.message);
        if (error.message.includes('chain')) {
          console.log('Chain not found, suggesting testnet...');
          await suggestCheqdTestnet();
          console.log('Testnet suggested, trying to enable again...');
          await window.leap.enable('cheqd-testnet-6');
          console.log('Wallet enabled after suggesting chain');
        } else {
          throw error;
        }
      }

      setConnectionStep(4);
      console.log('Getting wallet key...');
      const key = await window.leap.getKey('cheqd-testnet-6');
      
      if (!key) {
        throw new Error('Failed to get wallet key');
      }
      
      const address = key.bech32Address;
      console.log('Got wallet address:', address);

      setConnectionStep(5);
      setConnectedAddress(address);
      
      console.log('Wallet connected successfully:', address);
      
      if (onConnect) {
        onConnect(address);
      } else {
        console.warn('onConnect callback not provided');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(`Failed to connect wallet: ${error.message}`);
      setConnectionStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for connect wallet event from Header
  useEffect(() => {
    const handleConnect = () => {
      connectWallet();
    };
    document.addEventListener('connectWallet', handleConnect);
    return () => {
      document.removeEventListener('connectWallet', handleConnect);
    };
  }, []);

  // Don't render anything since the button is in the header
  return null;
};

export default WalletConnect;