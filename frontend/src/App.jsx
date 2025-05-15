import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import './components/styles/FlightStyles.css';
import Header from './components/Header';
import BookingForm from './components/BookingForm';
import BookingResult from './components/BookingResult';
import WalletConnect from './components/WalletConnect';
import MyTrips from './components/MyTrips';

const Verify = () => <div className="container"><h1>Verify Credentials</h1><p>Verify your travel credentials here.</p></div>;
const Support = () => <div className="container"><h1>Support</h1><p>Contact support for assistance.</p></div>;

function App() {
  const [bookingResult, setBookingResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const handleBookingSubmit = async (bookingDetails) => {
    // The API call is now made only after the transaction is successful
    // This is triggered by the BookingForm component after wallet transaction completes
    setIsLoading(true);
    try {
      // Check if we have a transaction hash from the wallet
      if (!bookingDetails.transactionHash) {
        throw new Error('No transaction hash provided. Payment not confirmed.');
      }
      
      console.log('Transaction confirmed with hash:', bookingDetails.transactionHash);
      console.log('Proceeding with booking submission...');
      
      // Check if this is a simulated transaction (starts with 'tx' followed by random string)
      const isSimulated = bookingDetails.transactionHash.startsWith('tx') && 
                          !bookingDetails.transactionHash.includes('/');
      
      // Add simulation flag to the booking details
      const bookingPayload = {
        ...bookingDetails,
        walletAddress,
        simulatedPayment: isSimulated
      };
      
      console.log('Booking payload:', bookingPayload);
      
      const response = await fetch('http://localhost:3001/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Server error during booking process');
      }
      
      const data = await response.json();
      
      // Add a note about simulation if applicable
      if (isSimulated) {
        data.simulationNotice = 'This booking was processed in simulation mode. In a production environment, real tokens would be transferred.';
      }
      
      setBookingResult(data);
    } catch (error) {
      console.error('Error during booking:', error);
      setBookingResult({
        success: false,
        message: error.message || 'Booking failed. Please try again.',
        details: error.stack
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletConnect = (address) => {
    setWalletConnected(true);
    setWalletAddress(address);
  };
  
  const handleCloseBookingResult = () => {
    setBookingResult(null);
  };

  return (
    <Router>
      <div className="app">
        <Header walletConnected={walletConnected} walletAddress={walletAddress} />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <div className="container">
                  {!walletConnected ? (
                    <WalletConnect onConnect={handleWalletConnect} />
                  ) : (
                    <>
                      <BookingForm 
                        onSubmit={handleBookingSubmit} 
                        isLoading={isLoading} 
                        walletAddress={walletAddress} 
                      />
                    </>
                  )}
                </div>
              }
            />
            <Route path="/verify" element={<Verify />} />
            <Route path="/trips" element={<div className="container"><MyTrips /></div>} />
            <Route path="/support" element={<Support />} />
          </Routes>
          
          {bookingResult && (
            <BookingResult 
              result={bookingResult} 
              onClose={handleCloseBookingResult} 
            />
          )}
        </main>
        <footer className="footer">
          <div className="container">
            <p>Powered by cheqd Trust Registry & Verifiable Credentials</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;