import React from 'react';
import './styles/FlightDeals.css';

const FlightDeals = () => {
  // Flight deals data

  // Flight deals data
  const deals = [
    {
      id: 1,
      destination: 'New York',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1170&q=80',
      price: `750CHEQ`,
      airline: 'Alliance Air',
      departureDate: '2025-05-17',
      airport: 'DEL - JFK',
      direct: true
    },
    {
      id: 2,
      destination: 'London',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1170&q=80',
      price: `700CHEQ`,
      airline: 'Alliance Air',
      departureDate: '2025-06-29',
      airport: 'DEL - LHR',
      direct: false
    },
    {
      id: 3,
      destination: 'Singapore',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1170&q=80',
      price: `700CHEQ`,
      airline: 'Alliance Air',
      departureDate: '2025-06-29',
      airport: 'DEL - SIN',
      direct: false
    },
    {
      id: 4,
      destination: 'Tokyo',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1171&q=80',
      price: `900CHEQ`,
      airline: 'Japan Airlines',
      departureDate: '2025-07-12',
      airport: 'DEL - HND',
      direct: true
    },
    {
      id: 5,
      destination: 'Dubai',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1170&q=80',
      price: `550CHEQ`,
      airline: 'Emirates',
      departureDate: '2025-08-05',
      airport: 'DEL - DXB',
      direct: true
    }
  ];

  return (
    <div className="flight-deals-container">
      
      {/* Flight deals section */}
      <div className="flight-deals-section">
        <div className="section-header">
          <h2 className="section-title">Flight deals from India</h2>
          <p className="section-subtitle">Here are the flight deals with the lowest prices. Act fast – they all depart within the next three months.</p>
        </div>
        
        <div className="deals-list">
          {deals.map((deal) => (
            <div key={deal.id} className="deal-item">
              <div className="deal-image" style={{ backgroundImage: `url(${deal.image})` }}>
                <div className="destination-label">
                  <h3>{deal.destination}</h3>
                </div>
              </div>
              <div className="deal-details">
                <div className="deal-date-badge">
                  <span className="badge-letter">A</span>
                  <div className="date-info">
                    <div className="day-month">
                      {new Date(deal.departureDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="airport-info">{deal.airport} with {deal.airline}</div>
                  </div>
                </div>
                <div className="deal-price-info">
                  {deal.direct && <span className="direct-badge">Direct</span>}
                  <span className="deal-price">{deal.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="view-more-deals">
        <button className="btn btn-outline">View more deals</button>
      </div>
    </div>
  );
};

export default FlightDeals;
