import React from 'react';

const SimpleHeader = () => {
  return (
    <header style={{
      width: '100%',
      backgroundColor: '#0d5ab9',
      padding: '20px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      borderBottom: '3px solid #ff9900'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: 'white',
          marginRight: '20px'
        }}>
          TrustTrip
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
          Secure Travel Booking with Verifiable Credentials
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '25px' }}>
        <a href="#" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none', fontSize: '16px' }}>Book</a>
        <a href="#" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '16px' }}>Verify</a>
        <a href="#" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '16px' }}>Trips</a>
        <a href="#" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '16px' }}>Support</a>
      </div>
    </header>
  );
};

export default SimpleHeader;
