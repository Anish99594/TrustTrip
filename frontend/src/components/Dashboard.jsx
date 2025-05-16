import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlane, FaHotel, FaCar, FaUsers, FaMoneyBillWave, FaGlobe, FaBuilding, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import './styles/Dashboard.css';

const Dashboard = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Helper function to format dates
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
    // Add a flag to prevent multiple simultaneous API calls
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error state on new fetch attempt
        
        // Fetch global statistics
        try {
          const statsResponse = await axios.get('https://trusttrip.onrender.com/api/stats');
          if (isMounted) setStats(statsResponse.data.data);
        } catch (statsError) {
          console.error('Error fetching stats:', statsError);
          // Create mock stats data if API fails
          if (isMounted) {
            setStats({
              totalBookings: 0,
              totalUsers: 0,
              totalSpent: 0,
              bookingsByType: { flight: 0, hotel: 0, car: 0 },
              popularDestinations: [],
              popularProviders: []
            });
          }
        }
        
        // Fetch user profile if wallet is connected
        if (walletAddress) {
          try {
            // First get the bookings directly
            const bookingsResponse = await axios.get(`https://trusttrip.onrender.com/api/bookings/${walletAddress}`);
            const bookings = bookingsResponse.data.data || [];
            console.log('Fetched bookings:', bookings.length);
            
            // Calculate total spent
            const totalSpent = bookings.reduce((sum, booking) => {
              const price = typeof booking.price === 'number' 
                ? booking.price 
                : (typeof booking.price === 'string' ? parseFloat(booking.price) : 0);
              return sum + price;
            }, 0);
            
            // Count bookings by type
            const flightBookings = bookings.filter(booking => booking.bookingType === 'flight').length;
            const hotelBookings = bookings.filter(booking => booking.bookingType === 'hotel').length;
            const carBookings = bookings.filter(booking => booking.bookingType === 'car').length;
            
            // Get most recent booking
            const mostRecentBooking = bookings.length > 0 ? bookings[0] : null;
            
            // Determine member since date
            const oldestBooking = bookings.length > 0 ? 
              [...bookings].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] : null;
            const memberSince = oldestBooking ? oldestBooking.createdAt : new Date().toISOString();
            
            // Create user profile
            const userProfile = {
              walletAddress,
              bookings: bookings,
              totalSpent: totalSpent,
              bookingsByType: { 
                flight: flightBookings, 
                hotel: hotelBookings, 
                car: carBookings 
              },
              mostRecentBooking,
              memberSince
            };
            
            if (isMounted) {
              console.log('Setting user profile with data:', {
                bookingsCount: bookings.length,
                totalSpent,
                memberSince: formatDate(memberSince)
              });
              setUserProfile(userProfile);
            }
          } catch (userError) {
            console.log('Error fetching user data:', userError);
            // Create empty user profile if API fails
            if (isMounted) {
              setUserProfile({
                walletAddress,
                bookings: [],
                totalSpent: 0,
                bookingsByType: { flight: 0, hotel: 0, car: 0 },
                mostRecentBooking: null,
                memberSince: new Date().toISOString()
              });
            }
          }
        }
        
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (isMounted) {
          setError('Failed to load dashboard data. Please try again later.');
          setLoading(false);
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <FaSpinner className="loading-spinner" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <FaExclamationTriangle className="error-icon" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>TrustTrip Analytics Dashboard</h2>
      
      {walletAddress && userProfile && (
        <div className="user-profile-section">
          <h3>Your Travel Profile</h3>
          <div className="user-stats">
            <div className="user-stat-card">
              <h4>Total Bookings</h4>
              <p className="stat-value">{Array.isArray(userProfile.bookings) ? userProfile.bookings.length : 0}</p>
            </div>
            <div className="user-stat-card">
              <h4>Total Spent</h4>
              <p className="stat-value">
                {typeof userProfile.totalSpent === 'number' 
                  ? userProfile.totalSpent.toFixed(8) 
                  : (typeof userProfile.totalSpent === 'string' 
                      ? parseFloat(userProfile.totalSpent).toFixed(8) 
                      : '0.00000000')
                } CHEQ
              </p>
            </div>
            <div className="user-stat-card">
              <h4>Member Since</h4>
              <p className="stat-value">{formatDate(userProfile.memberSince) || new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
      
      {stats && (
        <>
          <div className="stats-section">
            <h3>Platform Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h4>Total Users</h4>
                  <p className="stat-value">{stats.totalUsers}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaMoneyBillWave />
                </div>
                <div className="stat-content">
                  <h4>Total Volume</h4>
                  <p className="stat-value">{(stats.totalSpent || 0).toFixed(8)} CHEQ</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaPlane />
                </div>
                <div className="stat-content">
                  <h4>Flight Bookings</h4>
                  <p className="stat-value">{stats.bookingsByType?.flight || 0}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaHotel />
                </div>
                <div className="stat-content">
                  <h4>Hotel Bookings</h4>
                  <p className="stat-value">{stats.bookingsByType?.hotel || 0}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaCar />
                </div>
                <div className="stat-content">
                  <h4>Car Rentals</h4>
                  <p className="stat-value">{stats.bookingsByType?.car || 0}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaGlobe />
                </div>
                <div className="stat-content">
                  <h4>Total Bookings</h4>
                  <p className="stat-value">{stats.totalBookings || 0}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="insights-section">
            <div className="insights-row">
              <div className="insights-card">
                <h3>Popular Destinations</h3>
                {(stats.popularDestinations || []).length > 0 ? (
                  <ul className="insights-list">
                    {(stats.popularDestinations || []).map((item, index) => (
                      <li key={index} className="insights-item">
                        <div className="insights-item-name">
                          <FaGlobe className="insights-icon" />
                          <span>{item.destination || `Destination ${index + 1}`}</span>
                        </div>
                        <div className="insights-item-value">{item.count || 0} bookings</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No destination data available yet</p>
                )}
              </div>
              
              <div className="insights-card">
                <h3>Popular Providers</h3>
                {(stats.popularProviders || []).length > 0 ? (
                  <ul className="insights-list">
                    {(stats.popularProviders || []).map((item, index) => (
                      <li key={index} className="insights-item">
                        <div className="insights-item-name">
                          <FaBuilding className="insights-icon" />
                          <span>{item.provider || `Provider ${index + 1}`}</span>
                        </div>
                        <div className="insights-item-value">{item.count || 0} bookings</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No provider data available yet</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className="dashboard-footer">
        <p>Data is updated in real-time as bookings are made on the platform</p>
        <p>Powered by MongoDB and CHEQ blockchain</p>
      </div>
    </div>
  );
};

export default Dashboard;
