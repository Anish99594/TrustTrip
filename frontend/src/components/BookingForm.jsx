import { useState } from 'react';

const BookingForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    destination: '',
    budget: '',
    departureDate: '',
    returnDate: '',
    travelers: 1,
    bookingType: 'flight' // 'flight' or 'hotel'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="card">
      <h2 className="card-title">Book Your Travel</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="bookingType" className="form-label">Booking Type</label>
          <select
            id="bookingType"
            name="bookingType"
            className="form-input"
            value={formData.bookingType}
            onChange={handleChange}
            required
          >
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="destination" className="form-label">Destination</label>
          <input
            type="text"
            id="destination"
            name="destination"
            className="form-input"
            placeholder="Where do you want to go?"
            value={formData.destination}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="budget" className="form-label">Budget (USD)</label>
          <input
            type="number"
            id="budget"
            name="budget"
            className="form-input"
            placeholder="Your maximum budget"
            value={formData.budget}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        
        <div className="date-inputs">
          <div className="form-group">
            <label htmlFor="departureDate" className="form-label">Departure Date</label>
            <input
              type="date"
              id="departureDate"
              name="departureDate"
              className="form-input"
              value={formData.departureDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="returnDate" className="form-label">Return Date</label>
            <input
              type="date"
              id="returnDate"
              name="returnDate"
              className="form-input"
              value={formData.returnDate}
              onChange={handleChange}
              min={formData.departureDate || new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="travelers" className="form-label">Number of Travelers</label>
          <input
            type="number"
            id="travelers"
            name="travelers"
            className="form-input"
            value={formData.travelers}
            onChange={handleChange}
            min="1"
            max="10"
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            'Find & Book Securely'
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;