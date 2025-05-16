import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import './components/styles/FlightStyles.css';
import Header from './components/Header';
import BookingForm from './components/BookingForm';
import BookingResult from './components/BookingResult';
import WalletConnect from './components/WalletConnect';
import MyTrips from './components/MyTrips';
import AiAssistant from './components/AiAssitant';
import WalletTransaction from './components/WalletTransaction';
import BookingHistory from './components/BookingHistory';
import Dashboard from './components/Dashboard';
import WalletDetector from './components/WalletDetector';
import LeapWalletTest from './components/LeapWalletTest';

const Verify = () => <div className="container"><h1>Verify Credentials</h1><p>Verify your travel credentials here.</p></div>;
const Support = () => <div className="container"><h1>Support</h1><p>Contact support for assistance.</p></div>;

function App() {
  const [bookingResult, setBookingResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showTransaction, setShowTransaction] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [transactionAmount, setTransactionAmount] = useState(0);

  // Initial booking submission - this will trigger the transaction flow
  const handleBookingSubmit = async (bookingDetails) => {
    if (!walletConnected) {
      setBookingResult({
        success: false,
        message: 'Please connect your wallet before booking.',
      });
      return;
    }
    
    // First, get a price estimate
    setIsLoading(true);
    try {
      // Store the booking details for later use
      setPendingBooking(bookingDetails);
      
      // For demo purposes, we'll use a fixed amount
      // In a real app, you would get this from a price estimation API
      const estimatedPrice = 0.00007;
      setTransactionAmount(estimatedPrice);
      
      // Show the transaction component
      setShowTransaction(true);
    } catch (error) {
      console.error('Error preparing transaction:', error);
      setBookingResult({
        success: false,
        message: 'Failed to prepare transaction. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // This is called after the transaction is completed
  const handleTransactionComplete = async (txHash, isSimulated) => {
    setIsLoading(true);
    try {
      console.log(`Transaction completed with hash: ${txHash}, simulated: ${isSimulated}`);
      
      // Hide the transaction component
      setShowTransaction(false);
      
      // Now submit the booking with the transaction hash
      const response = await fetch('http://localhost:3001/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pendingBooking,
          walletAddress,
          transactionHash: txHash,
          simulatedPayment: isSimulated
        }),
      });
      
      const data = await response.json();
      setBookingResult(data);
    } catch (error) {
      console.error('Error during booking:', error);
      setBookingResult({
        success: false,
        message: 'Booking failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
      // Clear the pending booking
      setPendingBooking(null);
    }
  };
  
  // Cancel the transaction
  const handleTransactionCancel = () => {
    setShowTransaction(false);
    setPendingBooking(null);
  };

  const handleWalletConnect = (address) => {
    console.log('Wallet connect handler called with address:', address);
    if (address) {
      setWalletConnected(true);
      setWalletAddress(address);
      console.log('Wallet connected in App component:', address);
    } else {
      setWalletConnected(false);
      setWalletAddress('');
      console.log('Wallet disconnected in App component');
    }
  };
  
  const handleCloseBookingResult = () => {
    setBookingResult(null);
  };

  // One-time check for Leap wallet availability
  useEffect(() => {
    if (window.leap) {
      console.log('Leap wallet detected in App component');
    } else {
      console.log('Leap wallet not detected in App component');
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <WalletDetector />
        <Header walletConnected={walletConnected} walletAddress={walletAddress} />
        <Routes>
          <Route path="/" element={
            <>
              <WalletConnect onConnect={handleWalletConnect} />
              <BookingForm onSubmit={handleBookingSubmit} isLoading={isLoading} />
              {showTransaction && (
                <div className="modal-overlay">
                  <div className="modal-container modal-visible">
                    <WalletTransaction 
                      walletAddress={walletAddress}
                      amount={transactionAmount}
                      recipient="cheqd1j5sxqstwmjj3xltrfjzx25hr27m5xe694d5j0u"
                      onSuccess={handleTransactionComplete}
                      onCancel={handleTransactionCancel}
                    />
                  </div>
                </div>
              )}
              {bookingResult && <BookingResult result={bookingResult} onClose={() => setBookingResult(null)} />}
            </>
          } />
          <Route path="/trips" element={<MyTrips />} />
          <Route path="/bookings" element={<BookingHistory />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/support" element={<Support />} />
          <Route path="/assistant" element={<AiAssistant />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/wallet-test" element={<LeapWalletTest />} />
        </Routes>
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