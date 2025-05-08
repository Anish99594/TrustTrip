import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import BookingForm from './components/BookingForm'
import BookingResult from './components/BookingResult'
import WalletConnect from './components/WalletConnect'
// import { storeVerifiableCredential } from './utils/walletUtils'

function App() {
  const [bookingResult, setBookingResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const handleBookingSubmit = async (bookingDetails) => {
    setIsLoading(true);
    try {
      // Call the backend API
      const response = await fetch('http://localhost:3001/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingDetails,
          walletAddress
        }),
      });
      const data = await response.json();
      setBookingResult(data);
    } catch (error) {
      console.error('Error during booking:', error);
    } finally {
      setIsLoading(false);
      }
    };

  const handleWalletConnect = (address) => {
    setWalletConnected(true);
    setWalletAddress(address);
  };

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        {!walletConnected ? (
          <WalletConnect onConnect={handleWalletConnect} />
        ) : (
          <>
            <div className="wallet-info">
              <span className="wallet-badge">
                <span className="wallet-dot"></span>
                Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
              </span>
            </div>
            
            <BookingForm onSubmit={handleBookingSubmit} isLoading={isLoading} />
            
            {bookingResult && <BookingResult result={bookingResult} />}
          </>
        )}
      </main>
      
      <footer className="footer">
        <p>Powered by cheqd Trust Registry & Verifiable Credentials</p>
      </footer>
    </div>
  )
}

export default App