
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import OpenAI from 'openai';
import './styles/AiBot.css';

// Fallback responses when API is not available
const FALLBACK_RESPONSES = [
  "I'm currently experiencing high traffic. Here's some general information: Cheqd is a blockchain network focused on decentralized identity and payments.",
  "I'm unable to process your request right now. For the latest information about Flights & Hotels, please check our website.",
  "I'm currently at capacity. Did you know you can search for flights and hotels directly on our platform?",
  "I'm having trouble connecting to the AI service. Please try again later or contact support for immediate assistance.",
  "I'm currently unable to process AI requests. Here's a helpful tip: You can filter search results by price, rating, and amenities."
];

const getRandomFallback = () => {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
};

const AiAssitant = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [apiError, setApiError] = useState(null);
  const maxPromptLength = 500;
  const chatEndRef = useRef(null);
  const location = useLocation();

  // Auto-scroll to the bottom when a new message is added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Open popup immediately on all routes
  useEffect(() => {
    setIsOpen(true); // Immediate open
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

    // Add user message to chat history
    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setApiError(null);

    try {
      // Try to use OpenAI API if available
      const openai = new OpenAI({
        apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
        dangerouslyAllowBrowser: true, // Note: For development only
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant for a travel and blockchain platform. ' +
                    'Provide concise, helpful information about flights, hotels, and blockchain technology. ' +
                    'If you\'re asked about specific bookings, direct users to the appropriate section of the website.'
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
      
      // Handle different types of errors
      let errorMessage = 'I\'m having trouble connecting to the AI service. ';
      
      if (err.message?.includes('429') || err.status === 429) {
        errorMessage = 'I\'ve reached my limit for AI responses. ' + 
                     'Please try again later or contact support for assistance.';
        setApiError('rate_limit');
      } else if (err.message?.includes('401') || err.status === 401) {
        errorMessage = 'Authentication error. Please check your API configuration.';
        setApiError('auth_error');
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
        setApiError('offline');
      }
      
      // Add error message and fallback response
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
                    Start a conversation! Ask about blockchain, or Flights & Hotels.
                  </p>
                  <p className="bot-empty-example">
                    Example: "What is blockchain?"
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
                  placeholder="Ask about flights, hotels, or blockchain"
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

export default AiAssitant;
