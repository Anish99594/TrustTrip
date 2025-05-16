import { useState, useEffect } from 'react';

const WalletConnect = ({ onConnect, onDisconnect, onError }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Handle wallet connection
  const connectWallet = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.leap) {
        throw new Error('Leap Wallet not detected. Please install it first.');
      }

      await window.leap.enable('cheqd-testnet-6');
      const key = await window.leap.getKey('cheqd-testnet-6');
      
      if (key?.bech32Address) {
        onConnect?.(key.bech32Address);
        return key.bech32Address;
      }
      return null;
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      onError?.(err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Listen for connect wallet event
  useEffect(() => {
    const handleConnect = () => {
      connectWallet();
    };
    document.addEventListener('connectWallet', handleConnect);
    return () => {
      document.removeEventListener('connectWallet', handleConnect);
    };
  }, []);

  // Don't render anything
  return null;
};

export default WalletConnect;