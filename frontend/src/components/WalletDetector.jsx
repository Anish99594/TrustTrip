import { useEffect, useState } from 'react';

const WalletDetector = () => {
  const [walletStatus, setWalletStatus] = useState({
    detected: false,
    details: null,
    error: null
  });

  useEffect(() => {
    let intervalId;
    
    const checkWallet = () => {
      try {
        // Check if window.leap exists
        const isDetected = !!window.leap;
        
        // Only log on changes to avoid console spam
        if (isDetected !== walletStatus.detected) {
          console.log('Leap wallet detected:', isDetected);
        }
        
        if (isDetected) {
          // Try to get more details about the wallet
          const walletDetails = {
            type: typeof window.leap,
            methods: Object.keys(window.leap),
            hasEnable: typeof window.leap.enable === 'function',
            hasGetKey: typeof window.leap.getKey === 'function',
            hasGetOfflineSigner: typeof window.leap.getOfflineSigner === 'function'
          };
          
          // Only log details once to avoid console spam
          if (!walletStatus.detected) {
            console.log('Wallet details:', walletDetails);
          }
          
          setWalletStatus({
            detected: true,
            details: walletDetails,
            error: null
          });
          
          // If wallet is detected, we can slow down the check interval
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = setInterval(checkWallet, 5000); // Check every 5 seconds once detected
          }
        } else {
          setWalletStatus({
            detected: false,
            details: null,
            error: 'Leap wallet not detected'
          });
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
        setWalletStatus({
          detected: false,
          details: null,
          error: error.message
        });
      }
    };
    
    // Check immediately
    checkWallet();
    
    // Then check every 3 seconds
    intervalId = setInterval(checkWallet, 3000);
    
    // Clean up interval on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [walletStatus.detected]);

  return (
    <div className="wallet-detector" style={{ display: 'none' }}>
      {/* Hidden component that just logs wallet detection status */}
    </div>
  );
};

export default WalletDetector;
