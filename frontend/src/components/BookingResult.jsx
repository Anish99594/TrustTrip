import React from 'react';

const BookingResult = ({ result }) => {
  const { success, message, details } = result;
  
  return (
    <div className={`result-card ${success ? 'result-success' : 'result-error'}`}>
      <div className="result-header">
        <span className="result-icon">
          {success ? '✅' : '❌'}
        </span>
        <h3 className="result-title">
          {success ? 'Booking Confirmed!' : 'Booking Failed'}
        </h3>
      </div>
      
      <p>{message}</p>
      
      {success && details && (
        <div className="result-details">
          <div className="detail-row">
            <span className="detail-label">Provider:</span>
            <span>{details.provider}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Destination:</span>
            <span>{details.destination}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Dates:</span>
            <span>{details.dates}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Price:</span>
            <span>${details.price}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Booking ID:</span>
            <span>{details.bookingId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Verified via cheqd:</span>
            <span>✓ Trust Registry Verified</span>
          </div>
        </div>
      )}
      
      {success && (
        <p className="result-footer">
          A confirmation has been saved as a Verifiable Credential in your wallet.
        </p>
      )}
    </div>
  );
};

export default BookingResult;