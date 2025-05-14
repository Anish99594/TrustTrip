import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BookingResult = ({ result, onClose }) => {
  const { success, message, details, credential } = result || {};
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Fallback for bookingType
  const bookingType = details?.bookingType || 'travel';

  useEffect(() => {
    // Animate modal entrance
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Add booking to localStorage for My Trips
    if (success && details) {
      const existingTrips = JSON.parse(localStorage.getItem('myTrips') || '[]');
      const newTrip = {
        id: details.bookingId,
        type: bookingType,
        destination: details.destination,
        dates: details.dates,
        provider: details.provider,
        price: details.price,
        travelers: details.travelers,
        bookingDate: new Date().toISOString(),
      };
      
      // Check if this trip already exists
      const tripExists = existingTrips.some(trip => trip.id === newTrip.id);
      if (!tripExists) {
        localStorage.setItem('myTrips', JSON.stringify([...existingTrips, newTrip]));
      }
    }

    return () => clearTimeout(timer);
  }, [success, details, bookingType]);

  const handleViewTrips = () => {
    navigate('/trips');
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Wait for exit animation
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className={`modal-container ${isVisible ? 'modal-visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`result-card ${success ? 'result-success' : 'result-error'}`}>
          <button className="modal-close-btn" onClick={handleClose}>×</button>
          
          <div className="result-header">
            <span className={`result-icon ${success ? 'success-animation' : ''}`}>
              {success ? '✅' : '❌'}
            </span>
            <h3 className="result-title">
              {success ? 'Booking Confirmed!' : 'Booking Failed'}
            </h3>
          </div>
          
          <div className="result-message">{message}</div>
          
          {success && details && (
            <>
              <div className="booking-summary">
                <div className="summary-header">
                  <span className="summary-icon animate-float">
                    {bookingType === 'flight' ? '✈️' : bookingType === 'hotel' ? '🏨' : '🧳'}
                  </span>
                  <h4 className="summary-title">
                    {bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Details
                  </h4>
                </div>
                <div className="summary-destination">
                  <span className="destination-name">{details.destination}</span>
                  <span className="destination-dates">{details.dates}</span>
                </div>
              </div>
              
              <div className="result-details">
                <div className="detail-row">
                  <span className="detail-label">Provider:</span>
                  <span className="detail-value">{details.provider}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Destination:</span>
                  <span className="detail-value">{details.destination}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Dates:</span>
                  <span className="detail-value">{details.dates}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value price-value">${details.price}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Travelers:</span>
                  <span className="detail-value">{details.travelers}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Booking ID:</span>
                  <span className="detail-value id-value">{details.bookingId}</span>
                </div>
                <div className="detail-row verification-row">
                  <span className="detail-label">Verification Status:</span>
                  <span className="detail-value verified-value">
                    <span className="verified-icon pulse-animation">✓</span>
                    Trust Registry Verified
                  </span>
                </div>
              </div>
              
              <div className="credential-info">
                <div className="credential-header">
                  <span className="credential-icon shine-animation">🔐</span>
                  <h4 className="credential-title">Verifiable Credential</h4>
                </div>
                <p className="credential-description">
                  A secure digital credential has been issued to your wallet.
                </p>
                <div className="credential-details">
                  <div className="credential-row">
                    <span className="credential-label">Issuer:</span>
                    <span className="credential-value">
                      {credential?.issuer || 'did:cheqd:testnet:48e64dac-fbb1-46b1-9a31-a9e4c7ffe0d9'}
                    </span>
                  </div>
                  <div className="credential-row">
                    <span className="credential-label">Issued to:</span>
                    <span className="credential-value">
                      {credential?.subject
                        ? `${credential.subject.substring(0, 12)}...${credential.subject.substring(credential.subject.length - 8)}`
                        : 'did:cheqd:te...df64004e'}
                    </span>
                  </div>
                  <div className="credential-row">
                    <span className="credential-label">Schema:</span>
                    <span className="credential-value">TravelBookingCredential</span>
                  </div>
                </div>
              </div>
              
              <div className="result-actions">
                <button className="btn btn-secondary btn-animated">
                  <span className="btn-icon">📋</span>
                  View Details
                </button>
                <button className="btn btn-accent btn-animated">
                  <span className="btn-icon">📱</span>
                  Save to Wallet
                </button>
              </div>
              
              <div className="additional-actions">
                <button className="btn btn-primary btn-animated" onClick={handleViewTrips}>
                  <span className="btn-icon">🧳</span>
                  View My Trips
                </button>
              </div>
            </>
          )}
          
          {!success && (
            <div className="error-suggestions">
              <h4 className="suggestions-title">Suggestions:</h4>
              <ul className="suggestions-list">
                <li>Try a different destination</li>
                <li>Increase your budget</li>
                <li>Try different dates</li>
                <li>Check your wallet connection</li>
              </ul>
              <button className="btn btn-primary btn-block btn-animated" onClick={handleClose}>
                <span className="btn-icon">↩️</span>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingResult;