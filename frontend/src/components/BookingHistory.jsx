import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlane, FaHotel, FaCar, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import './styles/BookingHistory.css';

const BookingHistory = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Check if wallet is connected
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.leap) {
          const key = await window.leap.getKey('cheqd-testnet-6').catch(() => null);
          if (key && key.bech32Address) {
            setWalletAddress(key.bech32Address);
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };
    
    checkWalletConnection();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:3001/api/bookings/${walletAddress}`);
        setBookings(response.data.data);
        
        // Also fetch stats
        const statsResponse = await axios.get('http://localhost:3001/api/stats');
        setStats(statsResponse.data.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load booking history. Please try again later.');
        setLoading(false);
      }
    };

    fetchBookings();
  }, [walletAddress]);

  const getBookingTypeIcon = (type) => {
    switch (type) {
      case 'flight':
        return <FaPlane className="booking-icon flight" />;
      case 'hotel':
        return <FaHotel className="booking-icon hotel" />;
      case 'car':
        return <FaCar className="booking-icon car" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'N/A';
    }
  };

  if (!walletAddress) {
    return (
      <div className="booking-history-container">
        <div className="connect-wallet-message">
          <FaExclamationTriangle className="warning-icon" />
          <h3>Please connect your wallet to view booking history</h3>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="booking-history-container">
        <div className="loading-container">
          <FaSpinner className="loading-spinner" />
          <p>Loading your booking history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-history-container">
        <div className="error-container">
          <FaExclamationTriangle className="error-icon" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-history-container">
      <h2>Your Booking History</h2>
      
      {stats && (
        <div className="booking-stats">
          <div className="stat-card">
            <h3>Total Bookings</h3>
            <p className="stat-value">{stats.totalBookings}</p>
          </div>
          <div className="stat-card">
            <h3>Total Spent</h3>
            <p className="stat-value">{stats.totalSpent.toFixed(8)} CHEQ</p>
          </div>
          <div className="stat-card">
            <h3>Flights</h3>
            <p className="stat-value">{stats.bookingsByType.flight}</p>
          </div>
          <div className="stat-card">
            <h3>Hotels</h3>
            <p className="stat-value">{stats.bookingsByType.hotel}</p>
          </div>
        </div>
      )}
      
      {bookings.length === 0 ? (
        <div className="no-bookings-message">
          <p>You haven't made any bookings yet.</p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking.bookingId} className="booking-card">
              <div className="booking-header">
                {getBookingTypeIcon(booking.bookingType)}
                <h3>{booking.destination}</h3>
              </div>
              <div className="booking-details">
                <p><strong>Provider:</strong> {booking.provider || 'N/A'}</p>
                <p><strong>Dates:</strong> {formatDate(booking.departureDate)} - {formatDate(booking.returnDate)}</p>
                <p><strong>Price:</strong> {
                  typeof booking.price === 'number' 
                    ? booking.price.toFixed(8) 
                    : (typeof booking.price === 'string' 
                        ? parseFloat(booking.price).toFixed(8) 
                        : '0.00000000')
                } {booking.currency || 'CHEQ'}</p>
                <p><strong>Travelers:</strong> {booking.travelers || 1}</p>
                {booking.simulatedPayment && (
                  <p className="simulated-tag">Simulated Payment</p>
                )}
                {!booking.simulatedPayment && booking.transactionHash && (
                  <p className="transaction-hash">
                    <strong>TX:</strong> 
                    <a 
                      href={`https://testnet-explorer.cheqd.io/transactions/${booking.transactionHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {booking.transactionHash.substring(0, 10)}...
                    </a>
                  </p>
                )}
              </div>
              <div className="booking-footer">
                <p className="booking-date">Booked on {formatDate(booking.createdAt)}</p>
                <span className={`booking-status ${booking.bookingStatus}`}>{booking.bookingStatus}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
