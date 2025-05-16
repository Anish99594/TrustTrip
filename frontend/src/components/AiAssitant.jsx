import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import OpenAI from 'openai';
import { config, isAIAvailable } from '../config';
import './styles/AiBot.css';

// Fallback responses when API is not available
const FALLBACK_RESPONSES = [
  "I can help you find flights and hotels on TrustTrip. Where would you like to travel?",
  "Please use our booking form to search for flights. Enter your origin, destination, and travel dates to get started.",
  "Looking for a hotel? Use our search feature to find hotels by destination, check-in, and check-out dates.",
  "To check your booking status or manage your trips, please visit the 'My Trips' section.",
  "For help with your travel plans or any doubts, please visit our Support page."
];

const getRandomFallback = () => {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
};

const AiAssistant = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(() => {
    return localStorage.getItem('aiQuotaExceeded') === 'true';
  });
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const maxPromptLength = 500;
  const chatEndRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate(); // Added useNavigate hook
  const RATE_LIMIT_COOLDOWN = 5000; // 5 seconds for smoother interaction
  const openAIClient = useRef(null);

  // Initialize OpenAI client
  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const isQuotaExceeded = localStorage.getItem('aiQuotaExceeded') === 'true';
    
    if (!isQuotaExceeded && apiKey) {
      openAIClient.current = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });
    } else {
      setQuotaExceededState(true);
      openAIClient.current = null;
    }
  }, []);

  const setQuotaExceededState = (value) => {
    setQuotaExceeded(value);
    localStorage.setItem('aiQuotaExceeded', String(value));
  };

  // Fallback responses for common queries
  const getFallbackResponse = (prompt = '') => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('flight') || lowerPrompt.includes('fly')) {
      return `You can search for flights on TrustTrip using our booking form. Here’s how:\n` +
             `- **Origin**: Enter your departure city (e.g., India).\n` +
             `- **Destination**: Choose your destination (e.g., New York, Dubai, London, Singapore, Bali).\n` +
             `- **Travel Dates**: Select your departure date (e.g., today, May 16, 2025). For return trips, add a return date.\n` +
             `- **Trip Type**: Choose from Return, One-way, or Multi-city.\n` +
             `- **Travelers**: Select 1 to 10 adults.\n` +
             `- **Cabin Class**: Options include Economy, Premium Economy, Business, or First.\n` +
             `- **Filters**: Use "Direct flights only" or "Include nearby airports" to refine your search.\n` +
             `- **Budget**: Optionally set a budget to find flights within your price range.\n\n` +
             `TrustTrip supports over 1000+ airlines and flights to 190+ countries. For last-minute bookings like today, availability might be limited, so I recommend searching now. You’ll need to connect your Leap Wallet for payment—click 'Connect Wallet' in the header if you haven’t already. If you have any issues, visit our Support page.`;
    }
    if (lowerPrompt.includes('hotel') || lowerPrompt.includes('stay')) {
      return `To find hotels on TrustTrip, use our hotel booking form. Here’s how:\n` +
             `- **Destination**: Enter your destination (e.g., Mumbai, Dubai, Bangkok, London).\n` +
             `- **Check-in and Check-out Dates**: Select your stay dates (e.g., starting today, May 16, 2025).\n` +
             `- **Guests**: Choose 1 to 8 guests.\n` +
             `- **Room Type**: Options include Standard, Deluxe, Suite, or Executive.\n` +
             `- **Filters**: Use "Free cancellation" or "Breakfast included" to refine your search.\n` +
             `- **Budget**: Optionally set a budget per night.\n\n` +
             `We have over 3.2M+ properties worldwide, including luxury hotels, beach resorts, and budget options. For example, in Mumbai, you can find hotels like The Taj Mahal Palace (Luxury) or Hotel Guestinn Residency (Budget). You’ll need to connect your Leap Wallet for payment—click 'Connect Wallet' in the header. For more details or to manage bookings, visit the 'My Trips' section, and check our Support page for any issues.`;
    }
    if (lowerPrompt.includes('booking') || lowerPrompt.includes('reservation')) {
      return `You can manage your bookings in the 'My Trips' section. Here’s what you can do:\n` +
             `- Check the status of your flight or hotel booking.\n` +
             `- Cancel a booking if it’s eligible (for hotels, check if you selected the free cancellation option).\n` +
             `- View booking details like dates, destinations, and payment status.\n\n` +
             `If you need further assistance with your booking, please visit our Support page.`;
    }
    if (lowerPrompt.includes('cancel') || lowerPrompt.includes('cancellation')) {
      return `To cancel a booking on TrustTrip, follow these steps:\n` +
             `- Go to the 'My Trips' section to view your bookings.\n` +
             `- Find the booking you want to cancel and check its cancellation policy.\n` +
             `- For flights, cancellation policies depend on the airline—check the booking details.\n` +
             `- For hotels, if you selected the "Free cancellation" option during booking, you can cancel without charges up to the specified date.\n\n` +
             `If you’re unable to cancel or need help, please visit our Support page for assistance.`;
    }
    if (lowerPrompt.includes('wallet') || lowerPrompt.includes('payment')) {
      return `To make payments on TrustTrip, you need to connect your Leap Wallet. Here’s how:\n` +
             `- Click the 'Connect Wallet' button in the header.\n` +
             `- Follow the steps to link your Leap Wallet to the cheqd-testnet-6 network.\n` +
             `- Once connected, your wallet address will be displayed in the header (e.g., cheqd1...5j0u).\n` +
             `- You can then use your wallet to pay for flights or hotels securely.\n\n` +
             `If you’re having trouble connecting your wallet, ensure the Leap Wallet extension is installed. For more help, visit our Support page.`;
    }
    if (lowerPrompt.includes('help') || lowerPrompt.includes('support') || lowerPrompt.includes('doubt')) {
      return `I’m here to help with your travel doubts on TrustTrip! Here are some common queries I can assist with:\n` +
             `- **Flights**: Search for flights, choose trip types, cabin classes, and more.\n` +
             `- **Hotels**: Find hotels, select room types, and use filters like free cancellation.\n` +
             `- **Bookings**: Manage your bookings in the 'My Trips' section.\n` +
             `- **Payments**: Connect your Leap Wallet for secure payments.\n\n` +
             `For more assistance, please visit our Support page or let me know your specific doubt!`;
    }
    
    return getRandomFallback();
  };

  // Auto-scroll to the bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Open popup immediately on all routes
  useEffect(() => {
    setIsOpen(true);
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setMessages(prev => [...prev, { role: 'error', content: 'Please enter a message' }]);
      return;
    }

    if (prompt.length > maxPromptLength) {
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: `Your message is too long. Please keep it under ${maxPromptLength} characters.` 
      }]);
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_COOLDOWN) {
      setRateLimited(true);
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: `Please wait a moment before sending another message.` 
      }]);
      return;
    }

    if (quotaExceeded || !openAIClient.current) {
      setQuotaExceededState(true);
      const userMessage = { role: 'user', content: prompt };
      const assistantResponse = { 
        role: 'assistant', 
        content: `I'm currently in fallback mode. ${getFallbackResponse(prompt)}`
      };
      setMessages(prev => [...prev, userMessage, assistantResponse]);
      setPrompt('');
      return;
    }

    if (!isAIAvailable()) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'AI service is currently unavailable. Please try again later.'
      }]);
      return;
    }

    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setApiError(null);

    try {
      const now = Date.now();
      if (rateLimited && (now - lastRequestTime) < RATE_LIMIT_COOLDOWN) {
        throw new Error('rate_limit');
      }

      if (rateLimited && (now - lastRequestTime) >= RATE_LIMIT_COOLDOWN) {
        setRateLimited(false);
      }

      const openai = new OpenAI({
        apiKey: config.ai.openaiApiKey,
        dangerouslyAllowBrowser: true,
      });
      
      setLastRequestTime(now);

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `You are an AI assistant for TrustTrip, a travel and blockchain platform. Your role is to provide detailed, step-by-step guidance about TrustTrip services, focusing on:

1. **Flight Bookings and Information**:
   - Trip types: Return, One-way, Multi-city.
   - Cabin classes: Economy, Premium Economy, Business, First.
   - Popular destinations: New York, Dubai, London, Singapore, Bali.
   - Filters: "Direct flights only", "Include nearby airports".
   - Budget: Users can specify a budget.
   - Coverage: Over 1000+ airlines, 190+ countries.
   - Note: For last-minute bookings (e.g., today, May 16, 2025), mention that availability might be limited.

2. **Hotel Bookings and Information**:
   - Room types: Standard, Deluxe, Suite, Executive.
   - Popular hotel destinations: Dubai, Bangkok, London.
   - Filters: "Free cancellation", "Breakfast included".
   - Budget: Users can specify a budget per night.
   - Coverage: Over 3.2M+ properties worldwide.
   - Examples: The Taj Mahal Palace (Mumbai, Luxury), ITC Maratha (Mumbai, Business), Hotel Guestinn Residency (New Delhi, Budget).

3. **Booking Management**:
   - Users can check status, cancel, or view details in the "My Trips" section.
   - For cancellations, mention checking the policy (e.g., free cancellation for hotels if selected).

4. **Wallet and Blockchain Transactions**:
   - Users must connect their Leap Wallet via the "Connect Wallet" button in the header.
   - Payments are made on the cheqd-testnet-6 network.
   - Troubleshooting: Ensure Leap Wallet extension is installed; visit Support page for issues.

5. **Customer Doubts**:
   - Address doubts about booking, cancellations, payments, and general navigation.
   - Guide users to the "My Trips" or "Support" sections for further help.

6. **General Information**:
   - TrustTrip supports 190+ countries, 1000+ airlines, 3.2M+ properties, and 50M+ happy travelers.

**Instructions**:
- Provide detailed, step-by-step guidance for every query.
- Include all relevant options (e.g., trip types, cabin classes, room types, filters).
- Proactively address potential doubts (e.g., payment setup, cancellation policies, last-minute booking concerns).
- Mention the need to connect Leap Wallet for payments in every response where applicable.
- Guide users to the "My Trips" or "Support" sections for additional help.
- DO NOT answer questions unrelated to TrustTrip services. Politely explain that you can only assist with TrustTrip-related inquiries about flights, hotels, bookings, or wallet transactions.`
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
    } catch (err) {
      console.error('AI API Error:', err);
      
      let errorMessage = 'I\'m having trouble connecting to the AI service. ';
      
      if (err.message?.includes('429') || err.status === 429 || err.message === 'rate_limit') {
        errorMessage = 'I\'m getting too many requests. Please wait a moment and try again.';
        setApiError('rate_limit');
        setRateLimited(true);
        setLastRequestTime(Date.now());
      } else if (err.message?.includes('401') || err.status === 401) {
        errorMessage = 'Authentication error. Please check your API configuration.';
        setApiError('auth_error');
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
        setApiError('offline');
      } else if (err.message?.includes('quota') || err.message?.includes('billing') || 
          (err.status === 429 && err.message?.includes('exceeded your current quota'))) {
        errorMessage = 'The AI service has reached its usage limit. Please try again later.';
        setApiError('quota_exceeded');
        setQuotaExceededState(true);
        if (openAIClient.current) { // Safeguard to ensure we only access .current
          openAIClient.current = null;
        }
        
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: `I'm currently unable to process AI requests. ${getFallbackResponse(prompt)}`
          }
        ]);
      } else if (err.message?.includes('AI service is currently unavailable')) {
        errorMessage = 'AI service is currently unavailable. Please try again later.';
        setApiError('service_unavailable');
      }
      
      setMessages(prev => [
        ...prev, 
        { 
          role: 'error', 
          content: errorMessage 
        },
        { 
          role: 'assistant', 
          content: getRandomFallback() 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setPrompt('');
  };

  const handleClose = () => {
    setIsOpen(false);
    navigate('/'); // Redirect to the homepage
  };

  return (
    <>
      {isOpen && (
        <div className="bot-overlay" onClick={handleClose}>
          <div className="bot-container" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bot-header">
              <h1 className="bot-title">Flights & Hotels Assistant</h1>
              <button
                onClick={handleClose}
                className="bot-close-button"
              >
                Close
              </button>
            </div>

            {/* Chat Area */}
            <div className="bot-chat-area">
              {messages.length === 0 && (
                <div className="bot-empty-message">
                  <p className="bot-empty-text">
                    Start a conversation! Ask about flights, hotels, or bookings.
                  </p>
                  <p className="bot-empty-example">
                    Example: "Find me a flight to Dubai" or "What hotels are available in London?"
                  </p>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`bot-message ${
                    message.role === 'user'
                      ? 'bot-message-user'
                      : message.role === 'error'
                        ? 'bot-message-error'
                        : 'bot-message-assistant'
                  }`}
                >
                  <div className="bot-message-content">
                    {message.role === 'assistant' && (
                      <div className="bot-message-assistant-header">
                        <span className="bot-message-assistant-label">AI:</span>
                      </div>
                    )}
                    <p className="bot-message-text">{message.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="bot-loading">
                  <div className="bot-loading-content">
                    <div className="bot-loading-header">
                      <span className="bot-loading-label">AI:</span>
                      <div className="bot-loading-spinner"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="bot-input-area">
              {apiError && (
                <div className="bot-api-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{
                    apiError === 'rate_limit' 
                      ? 'AI service is currently limited. Some features may be restricted.'
                      : 'Limited functionality. Some features may not work as expected.'
                  }</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="bot-form">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask about flights, hotels, or bookings"
                  className="bot-textarea"
                  disabled={loading || apiError === 'rate_limit'}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  aria-label="Type your message"
                />
                <button
                  type="submit"
                  disabled={loading || apiError === 'rate_limit'}
                  className="bot-submit-button"
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="bot-submit-icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiAssistant;