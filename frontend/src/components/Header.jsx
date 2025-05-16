import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WalletConnect from './WalletConnect';

const Header = ({ walletConnected, walletAddress, onWalletConnect }) => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-text">TrustTrip</span>
          <span className="header-tagline">Secure Travel Booking</span>
        </div>
        <nav style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <ul style={{
            display: 'flex',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            gap: '1.5rem'
          }}>
            {['/', '/verify', '/trips', '/bookings', '/dashboard', '/support'].map((path, index) => {
              const isActive = window.location.pathname === path;
              return (
                <li key={path} style={{
                  margin: 0,
                  padding: 0
                }}>
                  <Link 
                    to={path}
                    style={{
                      textDecoration: 'none',
                      color: isActive ? '#1e88e5' : '#2d3748',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      padding: '0.5rem 0',
                      ':hover': {
                        color: '#1e88e5'
                      },
                      '::after': isActive ? {
                        content: '""',
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#1e88e5'
                      } : {}
                    }}
                  >
                    {['Book', 'Verify', 'Trips', 'Bookings', 'Dashboard', 'Support'][index]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="header-actions">
          <WalletConnect onConnect={onWalletConnect} />
          <button 
            className="btn btn-primary" 
            onClick={() => document.dispatchEvent(new CustomEvent('connectWallet'))}
            style={{
              backgroundColor: '#1e88e5',
              color: '#fff',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              marginRight: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>📁</span>
            {walletConnected ? 
              `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 
              'Connect Wallet'
            }
          </button>
          <button className="btn btn-secondary btn-back" onClick={() => navigate('/ai')}>
            <span>🤖</span> AI-Bot
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;