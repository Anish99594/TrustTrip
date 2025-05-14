import { useState } from 'react';
import FlightDeals from './FlightDeals';
import './styles/HotelStyles.css';
import { FaPlane, FaHotel, FaSuitcase, FaCalendarAlt, FaExchangeAlt, FaSearch, FaUsers, FaMoneyBillWave, FaMapMarkerAlt } from 'react-icons/fa';

const BookingForm = ({ onSubmit, isLoading }) => {
  const [activeTab, setActiveTab] = useState('flights');
  const [tripType, setTripType] = useState('return');
  const [formData, setFormData] = useState({
    origin: 'India (IN)',
    destination: '',
    departureDate: '',
    returnDate: '',
    travelers: 1,
    cabinClass: 'Economy',
    provider: 'Emirates',
    bookingType: 'flight',
    budget: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedBookingType = activeTab === 'flights' ? 'flight' : activeTab === 'hotels' ? 'hotel' : activeTab;
    onSubmit({ ...formData, bookingType: normalizedBookingType, tripType });
  };

  return (
    <div className="booking-form-container">
      {/* Hero section with background image - full width */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            {activeTab === 'flights' ? 'Discover the world, one flight at a time' : 
             activeTab === 'hotels' ? 'Find your perfect stay anywhere' : 'Create your dream journey'}
          </h1>
          <p className="hero-subtitle">
            {activeTab === 'flights' ? 'Compare and book flights with no hidden fees' : 
             activeTab === 'hotels' ? 'From luxury to budget, find the perfect place to stay' : 'All-inclusive packages crafted for unforgettable experiences'}
          </p>
          
          {/* Booking tabs */}
          <div className="booking-tabs-container">
            <div className="booking-tabs">
              <button
                className={`tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
                onClick={() => setActiveTab('flights')}
                type="button"
              >
                <span className="tab-icon"><FaPlane /></span> Flights
              </button>
              <button
                className={`tab-btn ${activeTab === 'hotels' ? 'active' : ''}`}
                onClick={() => setActiveTab('hotels')}
                type="button"
              >
                <span className="tab-icon"><FaHotel /></span> Hotels
              </button>
              <button
                className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
                onClick={() => setActiveTab('packages')}
                type="button"
              >
                <span className="tab-icon"><FaSuitcase /></span> Packages
              </button>
            </div>
            
            {/* Search form */}
            <div className="search-panel">
              {activeTab === 'flights' && (
                <div className="trip-type-selector">
                  <div className="radio-option">
                    <input 
                      id="return-trip"
                      type="radio" 
                      name="tripType" 
                      value="return" 
                      checked={tripType === 'return'}
                      onChange={() => setTripType('return')} 
                    />
                    <label htmlFor="return-trip" className="radio-label">Return</label>
                  </div>
                  
                  <div className="radio-option">
                    <input 
                      id="one-way-trip"
                      type="radio" 
                      name="tripType" 
                      value="one-way" 
                      checked={tripType === 'one-way'}
                      onChange={() => setTripType('one-way')} 
                    />
                    <label htmlFor="one-way-trip" className="radio-label">One way</label>
                  </div>
                  
                  <div className="radio-option">
                    <input 
                      id="multi-city-trip"
                      type="radio" 
                      name="tripType" 
                      value="multi-city" 
                      checked={tripType === 'multi-city'}
                      onChange={() => setTripType('multi-city')} 
                    />
                    <label htmlFor="multi-city-trip" className="radio-label">Multi-city</label>
                  </div>
                </div>
              )}
              
              <form className="search-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="origin"><FaPlane /> From</label>
                    <input
                      type="text"
                      id="origin"
                      name="origin"
                      value={formData.origin}
                      onChange={handleChange}
                      placeholder="City or airport"
                      required
                      className="enhanced-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="destination"><FaMapMarkerAlt /> To</label>
                    <input
                      type="text"
                      id="destination"
                      name="destination"
                      value={formData.destination}
                      onChange={handleChange}
                      placeholder="City or airport"
                      required
                      className="enhanced-input"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group date-group">
                    <label htmlFor="departureDate"><FaCalendarAlt /> Depart</label>
                    <input
                      type="date"
                      id="departureDate"
                      name="departureDate"
                      value={formData.departureDate}
                      onChange={handleChange}
                      required
                      className="enhanced-input"
                    />
                  </div>
                  
                  {tripType === 'return' && (
                    <div className="form-group return-date-group">
                      <label htmlFor="returnDate" className="return-date-label">
                        <span className="return-icon">🔄</span> Return
                      </label>
                      <input
                        type="date"
                        id="returnDate"
                        name="returnDate"
                        value={formData.returnDate}
                        onChange={handleChange}
                        required={tripType === 'return'}
                        className="enhanced-input"
                      />
                    </div>
                  )}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="travelers"><FaUsers /> Travelers</label>
                    <select
                      id="travelers"
                      name="travelers"
                      value={formData.travelers}
                      onChange={handleChange}
                      className="enhanced-select"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'adult' : 'adults'}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="cabinClass"><FaSuitcase /> Cabin Class</label>
                    <select
                      id="cabinClass"
                      name="cabinClass"
                      value={formData.cabinClass}
                      onChange={handleChange}
                      className="enhanced-select"
                    >
                      <option value="Economy">Economy</option>
                      <option value="Premium Economy">Premium Economy</option>
                      <option value="Business">Business</option>
                      <option value="First">First</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="budget"><FaMoneyBillWave /> Budget</label>
                    <input
                      type="text"
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      placeholder="Optional"
                      className="enhanced-input"
                    />
                  </div>
                </div>
                
                <div className="search-options">
                  <div className="checkbox-container">
                    <input type="checkbox" id="direct-flights" className="custom-checkbox" />
                    <label htmlFor="direct-flights">Direct flights only</label>
                  </div>
                  
                  <div className="checkbox-container">
                    <input type="checkbox" id="include-nearby" className="custom-checkbox" />
                    <label htmlFor="include-nearby">Include nearby airports</label>
                  </div>
                </div>
                
                <div className="search-button-container">
                  <button type="submit" className="search-button" disabled={isLoading}>
                    {isLoading ? <span className="spinner"></span> : <><FaSearch /> Search Flights</>}
                  </button>
                </div>
              </form>
            </div>

            {/* Fast search suggestions */}
            <div className="fast-search-suggestions">
              <div className="suggestions-label">Popular searches:</div>
              <div className="suggestion-tags">
                <span className="suggestion-tag">New York</span>
                <span className="suggestion-tag">Dubai</span>
                <span className="suggestion-tag">London</span>
                <span className="suggestion-tag">Singapore</span>
                <span className="suggestion-tag">Bali</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats section - applies to all tabs */}
      <div className="stats-section">
        <div className="stat-item">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-value">190+</div>
            <div className="stat-title">Countries</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">✈️</div>
          <div className="stat-content">
            <div className="stat-value">1000+</div>
            <div className="stat-title">Airlines</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">🏨</div>
          <div className="stat-content">
            <div className="stat-value">3.2M+</div>
            <div className="stat-title">Properties</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">50M+</div>
            <div className="stat-title">Happy Travelers</div>
          </div>
        </div>
      </div>

      {/* Hotel benefits section */}
      {activeTab === 'hotels' && (
        <div className="benefits-section">
          <div className="section-header">
            <h2 className="section-title">Travel smarter, not harder</h2>
            <p className="section-subtitle">Experience the best with our premium booking platform</p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <span className="benefit-emoji">💳</span>
              </div>
              <h3>Great hotel deals</h3>
              <p>We search for deals with the world's leading hotels, and share our findings with you.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <span className="benefit-emoji">🔔</span>
              </div>
              <h3>Up-to-date pricing</h3>
              <p>We always show you the most recent pricing overview we can find, so you know exactly what to expect.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <span className="benefit-emoji">⚖️</span>
              </div>
              <h3>Precise searching</h3>
              <p>Find hotels with swimming pools, free cancellation, and flexible booking. Or whatever matters most to you.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <span className="benefit-emoji">🔒</span>
              </div>
              <h3>Secure Booking</h3>
              <p>Your payment and personal information are always protected with state-of-the-art encryption.</p>
            </div>
          </div>
        </div>
      )}

      {/* Hotel deals section */}
      {activeTab === 'hotels' && (
        <div className="hotel-deals-section">
          <div className="section-header">
            <h2 className="section-title">Save on your next hotel booking</h2>
            <p className="section-subtitle">We've pulled together some top hotel deals, so you can find an amazing room at an even better price.</p>
          </div>

          <div className="discount-banner">
            <div className="discount-content">
              <div className="discount-icon">🏆</div>
              <div className="discount-text">
                <span className="discount-value">up to 35% off</span>
                <span className="discount-desc">on premium hotel bookings</span>
              </div>
            </div>
          </div>

          <div className="hotels-grid">
            {[
              { name: 'The Taj Mahal Palace', location: 'Mumbai', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1170&q=80', rating: 4.7, price: 18900, distance: '14.39 km from city centre', reviews: 10895, tag: 'Luxury' },
              { name: 'ITC Maratha', location: 'Mumbai', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1170&q=80', rating: 4.7, price: 8750, distance: '6.39 km from city centre', reviews: 6138, tag: 'Business' },
              { name: 'Hotel Guestinn Residency', location: 'New Delhi', image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1170&q=80', rating: 4.6, price: 970, distance: '0.89 km from city centre', reviews: 14, tag: 'Budget' },
            ].map((hotel, index) => (
              <div key={index} className="hotel-card">
                <div className="hotel-tag">{hotel.tag}</div>
                <div className="hotel-image" style={{ backgroundImage: `url(${hotel.image})` }}>
                  <div className="hotel-rating">
                    <span className="star-icon">★</span>
                    <span>{hotel.rating}</span>
                  </div>
                  <div className="hotel-wishlist">❤️</div>
                </div>
                <div className="hotel-details">
                  <h3>{hotel.name}, {hotel.location}</h3>
                  <p className="hotel-distance">{hotel.distance}</p>
                  <div className="hotel-amenities">
                    <span className="amenity">WiFi</span>
                    <span className="amenity">Pool</span>
                    <span className="amenity">Spa</span>
                  </div>
                  <div className="hotel-reviews">
                    <div className="review-score">{hotel.rating}</div>
                    <div className="review-text">Excellent</div>
                    <div className="review-count">{hotel.reviews.toLocaleString()} reviews</div>
                  </div>
                  <div className="hotel-price">
                    <span>₹{hotel.price.toLocaleString()}</span>
                    <span className="per-night">Per night</span>
                  </div>
                  <button className="view-hotel-btn">View Deal</button>
                </div>
              </div>
            ))}
          </div>
          <div className="view-all-container">
            <button className="view-all-btn">View All Hotel Deals</button>
          </div>
        </div>
      )}

      {/* City breaks section */}
      {activeTab === 'hotels' && (
        <div className="city-breaks-section">
          <div className="section-header">
            <h2 className="section-title">Hotels for fab city breaks</h2>
            <p className="section-subtitle">The key to a great city break? A perfectly-placed base. Check out the best city centre hotels.</p>
          </div>

          <div className="city-breaks-grid">
            {[
              { city: 'Dubai', country: 'United Arab Emirates', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1170&q=80', price: 560, properties: 2453 },
              { city: 'Bangkok', country: 'Thailand', image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1074&q=80', price: 560, properties: 3145 },
              { city: 'London', country: 'United Kingdom', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1170&q=80', price: 1009, properties: 4587 },
            ].map((city, index) => (
              <div key={index} className="city-card">
                <div className="city-image" style={{ backgroundImage: `url(${city.image})` }}>
                  <div className="city-overlay"></div>
                  <div className="properties-count">{city.properties} properties</div>
                </div>
                <div className="city-details">
                  <div className="city-info">
                    <h3>{city.city}</h3>
                    <p>{city.country}</p>
                  </div>
                  <div className="city-price">
                    <div className="price-label">From</div>
                    <div className="price-value">₹{city.price}</div>
                    <div className="price-period">a night</div>
                  </div>
                </div>
                <button className="explore-city-btn">Explore</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Travel packages section */}
      {activeTab === 'packages' && (
        <div className="packages-section">
          <div className="section-header">
            <h2 className="section-title">Exclusive Travel Packages</h2>
            <p className="section-subtitle">All-inclusive packages with flights, hotels, and experiences</p>
          </div>

          <div className="packages-grid">
            {[
              { name: 'Bali Adventure', duration: '7 days', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1738&q=80', price: 1200, rating: 4.8, featured: true },
              { name: 'European Tour', duration: '10 days', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1742&q=80', price: 2500, rating: 4.7 },
              { name: 'Thailand Beaches', duration: '5 days', image: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?auto=format&fit=crop&w=1740&q=80', price: 950, rating: 4.6 },
              { name: 'Japan Cultural Tour', duration: '8 days', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1740&q=80', price: 1800, rating: 4.9 },
            ].map((pkg, index) => (
              <div key={index} className={`package-card ${pkg.featured ? 'featured-package' : ''}`}>
                {pkg.featured && <div className="featured-badge">Featured</div>}
                <div className="package-image" style={{ backgroundImage: `url(${pkg.image})` }}>
                  <div className="package-overlay"></div>
                  <div className="package-duration">{pkg.duration}</div>
                  <div className="package-rating">
                    <span className="star-icon">★</span>
                    <span>{pkg.rating}</span>
                  </div>
                </div>
                <div className="package-content">
                  <h3>{pkg.name}</h3>
                  <div className="package-features">
                    <span className="package-feature">✈️ Flight</span>
                    <span className="package-feature">🏨 Hotel</span>
                    <span className="package-feature">🚗 Transport</span>
                  </div>
                  <div className="package-price">
                    <span>${pkg.price}</span>
                    <span className="per-person">per person</span>
                  </div>
                  <button className="view-package-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flight deals section */}
      {activeTab === 'flights' && <FlightDeals />}

      {/* Testimonials section */}
      <div className="testimonials-section">
        <div className="section-header">
          <h2 className="section-title">What our customers are saying</h2>
          <p className="section-subtitle">Join millions of happy travelers who book with us every year</p>
        </div>

        <div className="testimonials-grid">
          {[
            { name: 'Priya Sharma', location: 'Delhi', image: '/api/placeholder/100/100', quote: 'Found the best deal to Europe and saved over ₹15,000. The booking process was smooth and hassle-free.', rating: 5 },
            { name: 'Rahul Mehra', location: 'Mumbai', image: '/api/placeholder/100/100', quote: 'The hotel recommendations were spot-on! Exactly what I was looking for and at a great price.', rating: 5 },
            { name: 'Ananya Patel', location: 'Bengaluru', image: '/api/placeholder/100/100', quote: 'The package deal to Thailand was perfect. Everything was well-organized and we had a wonderful time.', rating: 4 },
          ].map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {'★'.repeat(testimonial.rating)}
                {'☆'.repeat(5 - testimonial.rating)}
              </div>
              <p className="testimonial-quote">{testimonial.quote}</p>
              <div className="testimonial-author">
                <img src={testimonial.image} alt={testimonial.name} className="testimonial-avatar" />
                <div className="testimonial-info">
                  <div className="testimonial-name">{testimonial.name}</div>
                  <div className="testimonial-location">{testimonial.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App download section */}
      <div className="app-download-section">
        <div className="app-content">
          <h2>Take us with you</h2>
          <p>Download our mobile app for seamless booking on-the-go. Get exclusive app-only deals and manage your bookings anytime, anywhere.</p>
          <div className="app-buttons">
            <button className="app-store-btn">
              <span className="btn-icon">📱</span> App Store
            </button>
            <button className="play-store-btn">
              <span className="btn-icon">🤖</span> Google Play
            </button>
          </div>
        </div>
        <div className="app-image">
          <img src="/api/placeholder/300/600" alt="Mobile app" />
        </div>
      </div>

      {/* Newsletter section */}
      <div className="newsletter-section">
        <div className="newsletter-content">
          <h2>Stay updated with the best travel deals</h2>
          <p>Subscribe to our newsletter and never miss out on exclusive offers, travel tips, and destination inspiration.</p>
          <form className="newsletter-form">
            <input type="email" placeholder="Enter your email address" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;