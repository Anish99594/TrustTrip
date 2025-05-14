import React, { useState, useEffect } from 'react';
import { FaWallet, FaExternalLinkAlt } from 'react-icons/fa';
import { EmbeddedWalletProvider, AccountModal } from "@leapwallet/embedded-wallet-sdk-react";
import "@leapwallet/embedded-wallet-sdk-react/styles.css";

const EnhancedWalletConnect = ({ onConnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);

  useEffect(() => {
    if (window.leap) {
      setWalletInstalled(true);
      checkWalletConnection();
    } else {
      setWalletInstalled(false);
    }
  }, []);

  const checkWalletConnection = async () => {
    try {
      // Check if Leap wallet is available
      if (window.leap) {
        // Try to get the key for the CHEQ testnet
        const key = await window.leap.getKey('cheqd-testnet-6').catch(() => null);
        
        if (key && key.bech32Address) {
          setIsConnected(true);
          setWalletAddress(key.bech32Address);
          
          // Notify parent component
          if (onConnect) {
            onConnect(key.bech32Address);
          }
          
          console.log('Wallet connected successfully:', key.bech32Address);
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      // Check if Leap wallet is available
      if (!window.leap) {
        console.error('Wallet not found. Please install the Leap wallet extension');
        return;
      }

      // Enable the wallet for the CHEQ testnet
      await window.leap.enable('cheqd-testnet-6');
      
      // Get the key for the CHEQ testnet
      const key = await window.leap.getKey('cheqd-testnet-6');
      
      setIsConnected(true);
      setWalletAddress(key.bech32Address);
      
      // Notify parent component
      if (onConnect) {
        onConnect(key.bech32Address);
      }
      
      console.log('Wallet connected successfully:', key.bech32Address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress('');
    
    // Notify parent component
    if (onConnect) {
      onConnect(null);
    }
  };

  // Chain data for the embedded wallet SDK
  const chainData = walletAddress ? {
    "cheqd-testnet-6": {
      address: walletAddress,
      restURL: "https://api.cheqd.network"
    }
  } : null;

  return (
    <div className="wallet-connect">
      {!isConnected ? (
        <div className="wallet-connect-header">
          <div className="wallet-icon-container">
            <span className="wallet-large-icon">🔐</span>
          </div>
          <h2 className="card-title">Connect Your Wallet</h2>
          <p className="wallet-subtitle">
            Secure your travel bookings with verifiable credentials
          </p>
          <div className="wallet-connect-action">
            <button
              className="btn btn-primary wallet-connect-btn"
              onClick={connectWallet}
              disabled={!walletInstalled}
            >
              <span className="btn-icon">🔗</span>
              Connect Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-connect-container">
          <div className="wallet-connect-header">
            <div className="wallet-icon-container">
              <span className="wallet-large-icon">💼</span>
            </div>
            <h2 className="card-title">Wallet Connected</h2>
            <p className="wallet-subtitle">
              Your wallet is ready for secure travel bookings
            </p>
          </div>
          
          <div className="wallet-info-section">
            <div className="wallet-info-icon">
              <FaWallet />
            </div>
            <div className="wallet-info-details">
              <div className="wallet-info-address">
                {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}
              </div>
              <div className="wallet-info-status">
                <span className="status-icon">✓</span> Connected
              </div>
            </div>
            <button className="wallet-disconnect" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsModalOpen(true)}
            style={{ marginTop: '1rem' }}
          >
            <FaExternalLinkAlt style={{ marginRight: '0.5rem' }} />
            View Wallet Details
          </button>
        </div>
      )}

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

      {/* Embedded Wallet SDK Modal */}
      <EmbeddedWalletProvider
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        connectedWalletType="leap"
        primaryChainId="cheqd-testnet-6"
      >
        <AccountModal
          theme="dark"
          chainRecords={chainData}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          config={{
            title: () => "CHEQ Wallet",
            subTitle: () => "Manage your CHEQ tokens",
            closeOnBackdropClick: true,
            closeOnEscape: true,
          }}
        />
      </EmbeddedWalletProvider>
    </div>
  );
};

export default EnhancedWalletConnect;
