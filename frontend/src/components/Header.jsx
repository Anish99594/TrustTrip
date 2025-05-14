import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header = ({ walletConnected, walletAddress }) => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-text">TrustTrip</span>
          <span className="header-tagline">Secure Travel Booking</span>
        </div>
        <nav className="header-nav">
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className="nav-link">Book</Link>
            </li>
            <li className="nav-item">
              <Link to="/verify" className="nav-link">Verify</Link>
            </li>
            <li className="nav-item">
              <Link to="/trips" className="nav-link">Trips</Link>
            </li>
            <li className="nav-item">
              <Link to="/support" className="nav-link">Support</Link>
            </li>
          </ul>
        </nav>
        <div className="header-actions">
          {walletConnected && (
            <span className="wallet-badge">
              <span className="wallet-dot"></span>
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </span>
          )}
          <button className="btn btn-secondary">
            <span>📱</span> Get the App
          </button>
          <button className="btn btn-secondary btn-back" onClick={() => navigate(-1)}>
            <span>⬅️</span> Back
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;