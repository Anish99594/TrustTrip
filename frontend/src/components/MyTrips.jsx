import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MyTrips = () => {
  const [trips, setTrips] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      const savedTrips = JSON.parse(localStorage.getItem('myTrips') || '[]');
      setTrips(savedTrips);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const getFilteredTrips = () => {
    if (activeFilter === 'all') return trips;
    return trips.filter(trip => trip.type === activeFilter);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'flight': return '✈️';
      case 'hotel': return '🏨';
      case 'package': return '🧳';
      default: return '🧳';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="my-trips-container">
      <div className="trips-header">
        <h1 className="trips-title">My Trips</h1>
        <p className="trips-subtitle">Manage your travel bookings and credentials</p>
      </div>

      <div className="trips-filters">
        <button 
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All Bookings
        </button>
        <button 
          className={`filter-btn ${activeFilter === 'flight' ? 'active' : ''}`}
          onClick={() => setActiveFilter('flight')}
        >
          <span className="filter-icon">✈️</span> Flights
        </button>
        <button 
          className={`filter-btn ${activeFilter === 'hotel' ? 'active' : ''}`}
          onClick={() => setActiveFilter('hotel')}
        >
          <span className="filter-icon">🏨</span> Hotels
        </button>
        <button 
          className={`filter-btn ${activeFilter === 'package' ? 'active' : ''}`}
          onClick={() => setActiveFilter('package')}
        >
          <span className="filter-icon">🧳</span> Packages
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="no-trips">
          <div className="no-trips-icon">🔍</div>
          <h3>No trips found</h3>
          <p>You haven't booked any trips yet. Start by booking your first trip!</p>
          <Link to="/" className="btn btn-primary btn-animated">
            <span className="btn-icon">✈️</span> Book a Trip
          </Link>
        </div>
      ) : (
        <div className="trips-grid">
          {getFilteredTrips().map((trip) => (
            <div key={trip.id} className="trip-card">
              <div className="trip-card-header">
                <span className="trip-type-icon">{getTypeIcon(trip.type)}</span>
                <span className="trip-type">{trip.type.charAt(0).toUpperCase() + trip.type.slice(1)}</span>
                <span className="trip-date">{formatDate(trip.bookingDate)}</span>
              </div>
              <div className="trip-card-body">
                <h3 className="trip-destination">{trip.destination}</h3>
                <div className="trip-dates">{trip.dates}</div>
                <div className="trip-provider">
                  <span className="provider-label">Provider:</span> {trip.provider}
                </div>
                <div className="trip-price">
                  <span className="price-value">${trip.price}</span>
                  <span className="travelers-info">for {trip.travelers} traveler{trip.travelers > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="trip-card-footer">
                <div className="trip-id">
                  <span className="id-label">Booking ID:</span>
                  <span className="id-value">{trip.id}</span>
                </div>
                <div className="trip-actions">
                  <button className="btn-icon-only" title="View Details">
                    <span className="icon">📋</span>
                  </button>
                  <button className="btn-icon-only" title="Download Ticket">
                    <span className="icon">🎫</span>
                  </button>
                  <button className="btn-icon-only" title="Share">
                    <span className="icon">📤</span>
                  </button>
                </div>
              </div>
              <div className="trip-card-badge">Verified ✓</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTrips;
