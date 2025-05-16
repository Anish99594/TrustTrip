const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
// Load environment variables
dotenv.config();
const fs = require('fs').promises;
const axios = require('axios');
const { OpenAI } = require('openai');

const { createDID, issueVC, checkTrustRegistry } = require('./services/cheqdService');
const { getWallet, createOrUpdateWallet, addFunds, makePayment, getTransactionHistory } = require('./services/walletService');

// Import MongoDB models
const Booking = require('./models/Booking');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
let useInMemoryStore = false; // Set to false to force MongoDB usage
const inMemoryBookings = [];
const inMemoryUsers = [];

const connectToMongoDB = async () => {
  try {
    // Try connecting to MongoDB Atlas first
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/trusttrip';
    console.log('Attempting to connect to MongoDB Atlas with URI:', mongoUri);
    
    // Connect with minimal options to avoid deprecation warnings
    await mongoose.connect(mongoUri);
    
    console.log('MongoDB Atlas connected');
    useInMemoryStore = false;
  } catch (atlasError) {
    console.error('❌ MongoDB Atlas connection error:', atlasError.message);
    console.error('Full error details:', atlasError);
    console.log('Attempting to connect to local MongoDB instance...');
    
    try {
      // Fallback to local MongoDB
      const localUri = 'mongodb://localhost:27017/trusttrip';
      console.log('Attempting to connect to local MongoDB with URI:', localUri);
      await mongoose.connect(localUri);
      console.log('Local MongoDB connected');
      useInMemoryStore = false;
    } catch (localError) {
      console.error('❌ Local MongoDB connection error:', localError.message);
      console.error('Full local error details:', localError);
      console.log('Running in memory-only mode (no persistent storage)');
      useInMemoryStore = true;
      
      // Add some sample data to the in-memory store
      if (inMemoryBookings.length === 0) {
        inMemoryBookings.push({
          bookingId: 'flight-123',
          walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
          bookingType: 'flight',
          provider: 'British Airways',
          destination: 'London',
          departureDate: '2025-06-01',
          returnDate: '2025-06-07',
          passengers: 1,
          totalAmount: 0.00007,
          transactionHash: 'B7904C90B63EFF0F95D0BB9F8BE40245D2FEF258BA98D433055AA094D4286ED2',
          status: 'confirmed',
          createdAt: new Date('2025-05-10'),
          isSimulated: false
        });
        
        inMemoryBookings.push({
          bookingId: 'hotel-456',
          walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
          bookingType: 'hotel',
          provider: 'Marriott Hotels',
          destination: 'Paris',
          checkInDate: '2025-07-15',
          checkOutDate: '2025-07-20',
          guests: 2,
          totalAmount: 0.00012,
          transactionHash: 'SIMULATED_TX_HASH_123',
          status: 'confirmed',
          createdAt: new Date('2025-05-12'),
          isSimulated: true
        });
        
        // Add a user to the in-memory store
        inMemoryUsers.push({
          walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
          userDID: 'did:cheqd:testnet:user123',
          bookings: ['flight-123', 'hotel-456'],
          createdAt: new Date('2025-05-01')
        });
      }
    }
  }
};

connectToMongoDB();

// CORS configuration
const corsOptions = {
  origin: '*', // Allow requests from any origin for development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Log CORS configuration
console.log('CORS origin:', corsOptions.origin);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Proxy endpoint for CHEQD RPC requests to avoid CORS issues
app.post('/api/proxy/cheqd-rpc', async (req, res) => {
  try {
    console.log('Proxying RPC request to CHEQD network:', req.body?.method || 'unknown method');
    
    // Handle different RPC methods appropriately
    const rpcUrl = process.env.CHEQD_TESTNET_RPC_URL || 'https://testnet.cheqd.network/';
    console.log(`Using RPC URL: ${rpcUrl}`);
    const response = await axios.post(rpcUrl, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Log success for debugging
    console.log(`RPC response received for ${req.body?.method || 'unknown method'}`);
    
    // Return the response exactly as received
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying RPC request:', error.message);
    if (error.response) {
      // If we have a response from the RPC server, forward it
      console.error('RPC server response:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    // Otherwise return a generic error
    res.status(500).json({ 
      error: error.message,
      jsonrpc: '2.0',
      id: req.body?.id || null,
      result: null
    });
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load Trust Registry
let trustRegistry;
async function loadTrustRegistry() {
  try {
    // Check if trustRegistry.json exists
    await fs.access('trustRegistry.json');
    const data = JSON.parse(await fs.readFile('trustRegistry.json', 'utf8'));
    if (!data.issuerDID || !data.schemaDID) {
      throw new Error('trustRegistry.json is missing required fields: issuerDID or schemaDID');
    }
    // Mock rootDID and providers as they are not in trustRegistry.json
    trustRegistry = {
      issuerDID: data.issuerDID,
      verifierDID: data.verifierDID || 'did:cheqd:testnet:placeholder-verifier',
      schemaDID: data.schemaDID,
      rootDID: 'did:cheqd:testnet:placeholder-root', // Mocked
      providers: [
        { type: 'flight', name: 'Air France', did: 'did:cheqd:testnet:provider-airfrance' },
        { type: 'flight', name: 'British Airways', did: 'did:cheqd:testnet:provider-britishairways' },
        { type: 'hotel', name: 'Marriott Hotels', did: 'did:cheqd:testnet:provider-marriott' },
        { type: 'hotel', name: 'Hilton Hotels', did: 'did:cheqd:testnet:provider-hilton' },
      ],
    };
    console.log('Loaded Trust Registry:', trustRegistry);
  } catch (error) {
    console.error('Error loading trustRegistry.json:', error.message);
    console.error('Please run `node setupTrustRegistry.js` to generate trustRegistry.json');
    process.exit(1);
  }
}

// Trusted providers from trustRegistry
let trustedProviders;

async function initializeServer() {
  await loadTrustRegistry();
  trustedProviders = trustRegistry.providers;
}

// Initialize server
initializeServer().catch((error) => {
  console.error('Server initialization failed:', error.message);
  process.exit(1);
});

const travelOptions = {
  flight: [
    { provider: 'Air France', destination: 'Paris', price: 0.00005, currency: 'CHEQ' },
    { provider: 'Air France', destination: 'Rome', price: 0.00006, currency: 'CHEQ' },
    { provider: 'British Airways', destination: 'London', price: 0.00004, currency: 'CHEQ' },
    { provider: 'British Airways', destination: 'New York', price: 0.00007, currency: 'CHEQ' },
  ],
  hotel: [
    { provider: 'Marriott Hotels', destination: 'Paris', price: 0.00003, currency: 'CHEQ' },
    { provider: 'Marriott Hotels', destination: 'Rome', price: 0.00002, currency: 'CHEQ' },
    { provider: 'Hilton Hotels', destination: 'London', price: 0.00003, currency: 'CHEQ' },
    { provider: 'Hilton Hotels', destination: 'New York', price: 0.00004, currency: 'CHEQ' },
  ],
};

// Helper function: Normalize destination to title case
function normalizeDestination(destination) {
  return destination
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function: AI-powered provider selection
async function selectProviderWithAI(type, destination, budget) {
  const normalizedDestination = normalizeDestination(destination);
  console.log(`Selecting provider for type: ${type}, destination: ${normalizedDestination}, budget: ${budget}`);

  // Check if the type is valid
  if (!travelOptions[type]) {
    console.log(`Invalid booking type: ${type}. Supported types are: ${Object.keys(travelOptions).join(', ')}`);
    return null;
  }

  // First check if we have matching options before trying AI
  const matchingOptions = travelOptions[type].filter(
    (opt) => opt.destination === normalizedDestination && opt.price <= budget
  );
  
  if (matchingOptions.length === 0) {
    console.log(`No options found for ${type} to ${normalizedDestination} within budget ${budget} CHEQ`);
    return null;
  }

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not found, using fallback selection method');
      throw new Error('OpenAI API key not configured');
    }
    
    const prompt = `
      You are a travel booking AI for a trustworthy booking agent. The user wants a ${type} to ${normalizedDestination} with a budget of ${budget} CHEQ.
      Available options:
      ${JSON.stringify(matchingOptions, null, 2)}
      Select the best provider that matches the destination and is within budget. Consider price (lower is better) and provider reputation.
      Respond with JSON: { "provider": "provider_name", "price": number, "destination": "destination" }
      If no options match, return null.
    `;
    console.log('OpenAI prompt:', prompt);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });
    const result = JSON.parse(response.choices[0].message.content);
    console.log('OpenAI response:', result);

    return result && result.provider ? result : null;
  } catch (error) {
    console.error('AI selection error:', error.message);
    console.log('Using fallback price-based selection method');
    
    // Fallback to rule-based selection
    const scoredOptions = matchingOptions.map((opt) => ({
      ...opt,
      score: 1 - opt.price / budget, // Higher score for lower price
    }));
    const selectedOption = scoredOptions.sort((a, b) => b.score - a.score)[0];
    console.log('Selected fallback option:', selectedOption);
    return selectedOption;
  }
}

// Helper function: Create booking details
function createBookingDetails(option, bookingData) {
  return {
    bookingId: uuidv4(),
    provider: option.provider,
    destination: option.destination,
    dates: `${bookingData.departureDate} to ${bookingData.returnDate}`,
    price: option.price,
    currency: option.currency || 'CHEQ',
    travelers: parseInt(bookingData.travelers),
    bookingType: bookingData.bookingType,
    transactionHash: bookingData.transactionHash,
    simulatedPayment: bookingData.simulatedPayment || false,
  };
}

// API endpoint for price estimation only (no booking creation)
app.post('/api/estimate-price', async (req, res) => {
  try {
    const bookingData = req.body;
    const { destination, budget, bookingType, walletAddress } = bookingData;
    console.log('Received price estimation request:', bookingData);

    // Validate inputs
    if (!destination || !bookingType || !walletAddress) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: destination, bookingType, or walletAddress',
      });
    }

    // Normalize destination
    const normalizedDestination = normalizeDestination(destination);

    // Find matching options
    const options = travelOptions[bookingType]?.filter(opt => opt.destination === normalizedDestination);
    
    if (!options || options.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No ${bookingType} options found for ${normalizedDestination}`,
      });
    }

    // Select the first matching option for simplicity
    const selectedOption = options[0];
    
    // Get provider DID from trust registry
    const providerInfo = trustRegistry.providers.find(
      (p) => p.type === bookingType && p.name === selectedOption.provider
    );
    const providerDID = providerInfo ? providerInfo.did : 'did:cheqd:testnet:unknown-provider';

    return res.json({
      success: true,
      price: selectedOption.price,
      currency: selectedOption.currency || 'CHEQ',
      provider: selectedOption.provider,
      providerDID,
      providerAddress: 'cheqd1r9acsgl9u0qk09knc3afc7aexlzuy2ewdksvp5', // Default recipient address
    });
  } catch (error) {
    console.error('Price estimation error:', error.message);
    return res.status(500).json({
      success: false,
      message: `Price estimation failed: ${error.message}`,
    });
  }
});
app.post('/api/book', async (req, res) => {
  try {
    const bookingData = req.body;
    console.log('Received booking request:', bookingData);
    
    // Extract booking data
    const {
      bookingType,
      destination,
      departureDate,
      returnDate,
      travelers,
      budget,
      walletAddress,
      transactionHash,
      simulatedPayment
    } = bookingData;
    
    // Validate essential booking data
    if (!bookingType || !destination || !departureDate || !walletAddress) {
      console.error('Missing required booking data');
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information',
      });
    }
    
    // Log if this is a simulated payment
    if (simulatedPayment) {
      console.log('⚠️ Processing simulated payment transaction:', transactionHash);
    } else {
      console.log('✅ Processing real blockchain transaction:', transactionHash);
    }
    console.log('Received booking request:', bookingData);

    // Validate inputs
    if (!destination || !budget || !bookingType || !walletAddress || !departureDate || !returnDate) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: destination, budget, bookingType, walletAddress, departureDate, or returnDate',
      });
    }
    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      console.log('Validation failed: Invalid budget');
      return res.status(400).json({
        success: false,
        message: 'Invalid budget provided',
      });
    }
    if (!/^(cheqd1[0-9a-z]{38})$/.test(walletAddress)) {
      console.log('Validation failed: Invalid wallet address');
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format',
      });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(departureDate) || !dateRegex.test(returnDate)) {
      console.log('Validation failed: Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format (use YYYY-MM-DD)',
      });
    }
    // Validate bookingType
    const validBookingTypes = Object.keys(travelOptions);
    if (!validBookingTypes.includes(bookingType)) {
      console.log(`Validation failed: Invalid booking type ${bookingType}. Supported types are: ${validBookingTypes.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: `Invalid booking type: ${bookingType}. Supported types are: ${validBookingTypes.join(', ')}`,
      });
    }

    // Select provider using AI
    const option = await selectProviderWithAI(bookingType, destination, parsedBudget);

    if (!option) {
      console.log(`No trusted ${bookingType} providers found for ${destination}`);
      return res.status(404).json({
        success: false,
        message: `No trusted ${bookingType} providers found for ${destination}`,
      });
    }

    if (option.price > parsedBudget) {
      console.log(`No ${bookingType} options within budget $${parsedBudget}`);
      return res.status(400).json({
        success: false,
        message: `No ${bookingType} options found within your budget of $${parsedBudget}`,
      });
    }
    
    // For blockchain wallets like Leap, we would normally verify on-chain here
    // But for this demo, we'll assume the wallet is valid and has sufficient funds
    // since the user has the Leap wallet installed with CHEQ tokens
    
    console.log(`Processing booking with wallet address: ${walletAddress}`);
    console.log(`Required payment: ${option.price} ${option.currency}`);
    
    // In a real implementation, we would:
    // 1. Create a payment request to the user's wallet
    // 2. Wait for the blockchain transaction to complete
    // 3. Verify the transaction on the blockchain
    
    // For now, we'll simulate a successful payment
    console.log(`Payment of ${option.price} CHEQ simulated successfully from wallet ${walletAddress}`);

    // Skip CHEQD operations for now and use mock values
    let userDID, aiDID, providerDID;
    try {
      // Instead of creating DIDs, use mock values
      userDID = `did:cheqd:testnet:user-${walletAddress.substring(0, 8)}`;
      aiDID = 'did:cheqd:testnet:ai-agent';
      
      const provider = trustedProviders.find(
        (p) => p.type === bookingType && p.name === option.provider
      );
      
      if (!provider) {
        console.log(`Provider ${option.provider} not found in trusted providers list`);
        // Use a mock provider DID instead of throwing an error
        providerDID = `did:cheqd:testnet:provider-${option.provider.toLowerCase().replace(/\s/g, '')}`;
      } else {
        providerDID = provider.did;
      }
      
      console.log(`Checking Trust Registry for provider DID: ${providerDID}`);
      const isTrusted = await checkTrustRegistry(providerDID);
      
      if (!isTrusted) {
        console.log(`Provider ${option.provider} is not verified in the Trust Registry`);
        // Continue anyway for demo purposes
      }
    } catch (error) {
      console.error('Trust registry operation error:', error.message);
      // Continue anyway for demo purposes
      userDID = `did:cheqd:testnet:user-${walletAddress.substring(0, 8)}`;
      aiDID = 'did:cheqd:testnet:ai-agent';
      providerDID = `did:cheqd:testnet:provider-${option.provider.toLowerCase().replace(/\s/g, '')}`;
    }

    // Create booking details with currency info
    const bookingDetails = createBookingDetails(option, bookingData);

    // Create a mock Verifiable Credential instead of using the issueVC function
    let bookingVC;
    try {
      // Create a mock VC with all the booking details
      bookingVC = {
        id: `cred:cheqd:testnet:${uuidv4()}`,
        issuer: aiDID,
        subject: userDID,
        data: {
          bookingType,
          provider: option.provider,
          providerDID,
          destination: option.destination,
          price: option.price,
          currency: option.currency || 'CHEQ',
          dates: `${departureDate} to ${returnDate}`,
          travelers,
          transactionHash: bookingData.transactionHash,
          simulatedPayment: simulatedPayment || false,
        },
        issuanceDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating mock VC:', error.message);
      // Continue anyway with a basic VC
      bookingVC = {
        id: `cred:cheqd:testnet:${uuidv4()}`,
        data: { bookingType, provider: option.provider, destination: option.destination }
      };
    }

    // Create a new booking
    const bookingId = uuidv4();
    let savedBooking;
    
    try {
      if (useInMemoryStore) {
        // Use in-memory store
        const newBooking = {
          bookingId,
          bookingType,
          provider: option.provider,
          providerDID,
          destination: option.destination,
          departureDate: new Date(departureDate),
          returnDate: returnDate ? new Date(returnDate) : null,
          price: option.price,
          currency: option.currency || 'CHEQ',
          travelers: parseInt(travelers) || 1,
          walletAddress,
          transactionHash,
          simulatedPayment: simulatedPayment || false,
          userDID,
          createdAt: new Date(),
          status: 'confirmed'
        };
        
        // Add to in-memory bookings
        inMemoryBookings.push(newBooking);
        savedBooking = newBooking;
        console.log('Booking saved to in-memory store:', bookingId);
        
        // Find or create user in memory
        let user = inMemoryUsers.find(u => u.walletAddress === walletAddress);
        if (!user) {
          user = {
            walletAddress,
            userDID,
            bookings: [bookingId],
            totalSpent: parseFloat(option.price) || 0,
            createdAt: new Date()
          };
          inMemoryUsers.push(user);
        } else {
          user.bookings.push(bookingId);
          user.totalSpent = (parseFloat(user.totalSpent) || 0) + (parseFloat(option.price) || 0);
        }
        console.log('User updated in in-memory store:', user.walletAddress);
      } else {
        // Use MongoDB
        try {
          const newBooking = new Booking({
            bookingId,
            bookingType,
            provider: option.provider,
            providerDID,
            destination: option.destination,
            departureDate: new Date(departureDate),
            returnDate: returnDate ? new Date(returnDate) : null,
            price: option.price,
            currency: option.currency || 'CHEQ',
            travelers: parseInt(travelers) || 1,
            walletAddress,
            transactionHash,
            simulatedPayment: simulatedPayment || false,
            userDID
          });

          // Save booking to database
          savedBooking = await newBooking.save();
          console.log('Booking saved to MongoDB:', savedBooking._id);

          // Find or create user and update their bookings
          let user = await User.findOne({ walletAddress });
          if (!user) {
            user = new User({
              walletAddress,
              userDID,
              bookings: [savedBooking._id],
              totalSpent: parseFloat(option.price) || 0
            });
          } else {
            user.bookings.push(savedBooking._id);
            user.totalSpent = (parseFloat(user.totalSpent) || 0) + (parseFloat(option.price) || 0);
          }
          await user.save();
          console.log('User updated with new booking:', user._id);
        } catch (dbError) {
          console.error('Error saving to MongoDB, falling back to in-memory:', dbError.message);
          
          // Fall back to in-memory if MongoDB save fails
          const newBooking = {
            bookingId,
            bookingType,
            provider: option.provider,
            providerDID,
            destination: option.destination,
            departureDate: new Date(departureDate),
            returnDate: returnDate ? new Date(returnDate) : null,
            price: option.price,
            currency: option.currency || 'CHEQ',
            travelers: parseInt(travelers) || 1,
            walletAddress,
            transactionHash,
            simulatedPayment: simulatedPayment || false,
            userDID,
            createdAt: new Date(),
            status: 'confirmed'
          };
          
          inMemoryBookings.push(newBooking);
          savedBooking = newBooking;
          console.log('Booking saved to in-memory store as fallback:', bookingId);
          
          // Update in-memory user
          let user = inMemoryUsers.find(u => u.walletAddress === walletAddress);
          if (!user) {
            user = {
              walletAddress,
              userDID,
              bookings: [bookingId],
              totalSpent: parseFloat(option.price) || 0,
              createdAt: new Date()
            };
            inMemoryUsers.push(user);
          } else {
            user.bookings.push(bookingId);
            user.totalSpent = (parseFloat(user.totalSpent) || 0) + (parseFloat(option.price) || 0);
          }
        }
      }
    } catch (storageError) {
      console.error('Critical error saving booking:', storageError.message);
      throw new Error(`Failed to save booking: ${storageError.message}`);
    }

    // Return booking confirmation
    console.log('Booking successful:', bookingDetails);
    
    // Prepare response object
    const responseObj = {
      success: true,
      message: `Your ${bookingType} has been booked successfully!`,
      details: bookingDetails,
      credential: bookingVC,
      bookingId: bookingId
    };
    
    // Add simulation notice if this was a simulated payment
    if (simulatedPayment) {
      responseObj.simulationNotice = 'This booking used a simulated blockchain transaction for demonstration purposes. In production, real CHEQ tokens would be transferred.';
    }
    
    return res.status(200).json(responseObj);
  } catch (error) {
    console.error('Booking error:', error.message);
    return res.status(500).json({
      success: false,
      message: `Booking failed: ${error.message}`,
    });
  }
});

// Booking API endpoints

// Get all bookings for a wallet address
app.get('/api/bookings/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address format
    if (!/^(cheqd1[0-9a-z]{38})$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    let bookings;
    if (useInMemoryStore) {
      // Use in-memory store
      bookings = inMemoryBookings.filter(booking => booking.walletAddress === walletAddress)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      // Use MongoDB
      console.log('Fetching bookings for wallet address:', walletAddress);
      bookings = await Booking.find({ walletAddress }).sort({ createdAt: -1 }).lean();
      console.log(`Found ${bookings.length} bookings for wallet address ${walletAddress}`);
      
      // Map MongoDB fields to expected frontend fields if needed
      bookings = bookings.map(booking => ({
        ...booking,
        // Ensure price is a number
        price: typeof booking.price === 'string' ? parseFloat(booking.price) : booking.price
      }));
    }
    
    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error retrieving bookings:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve bookings: ${error.message}`
    });
  }
});

// Get booking by ID
app.get('/api/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    let booking;
    if (useInMemoryStore) {
      // Use in-memory store
      booking = inMemoryBookings.find(b => b.bookingId === bookingId);
    } else {
      // Use MongoDB
      booking = await Booking.findOne({ bookingId });
    }
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error retrieving booking:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve booking: ${error.message}`
    });
  }
});

// Get user profile with booking history
app.get('/api/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address format
    if (!/^(cheqd1[0-9a-z]{38})$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    let user;
    if (useInMemoryStore) {
      // Use in-memory store
      user = inMemoryUsers.find(u => u.walletAddress === walletAddress);
    } else {
      // Use MongoDB
      user = await User.findOne({ walletAddress }).populate('bookings');
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error retrieving user profile:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve user profile: ${error.message}`
    });
  }
});

// Get user profile by wallet address
app.get('/api/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address format
    if (!/^(cheqd1[0-9a-z]{38})$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    console.log('Fetching user profile for wallet address:', walletAddress);
    
    // Fetch bookings first
    const bookings = await Booking.find({ walletAddress }).sort({ createdAt: -1 }).lean();
    console.log(`Found ${bookings.length} bookings for wallet address ${walletAddress}`);
    
    // Calculate total spent
    const totalSpent = bookings.reduce((sum, booking) => {
      const price = typeof booking.price === 'string' ? parseFloat(booking.price) : (booking.price || 0);
      return sum + price;
    }, 0);
    console.log('Total spent calculated:', totalSpent);
    
    // Count bookings by type
    const flightBookings = bookings.filter(booking => booking.bookingType === 'flight').length;
    const hotelBookings = bookings.filter(booking => booking.bookingType === 'hotel').length;
    const carBookings = bookings.filter(booking => booking.bookingType === 'car').length;
    
    // Get most recent booking
    const mostRecentBooking = bookings.length > 0 ? bookings[0] : null;
    
    // Find or create user
    let user = await User.findOne({ walletAddress });
    if (!user) {
      console.log('Creating new user for wallet address:', walletAddress);
      user = new User({
        walletAddress,
        userDID: `did:cheqd:testnet:user${Math.floor(Math.random() * 1000)}`,
        bookings: bookings.map(b => b.bookingId),
        totalSpent: totalSpent,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await user.save();
    } else {
      // Update user with latest booking info
      console.log('Updating existing user with latest booking info');
      user.bookings = bookings.map(b => b.bookingId);
      user.totalSpent = totalSpent;
      user.updatedAt = new Date();
      await user.save();
    }
    
    // Determine member since date (date of oldest booking or user creation date)
    const oldestBooking = bookings.length > 0 ? 
      [...bookings].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] : null;
    const memberSince = oldestBooking ? oldestBooking.createdAt : user.createdAt;
    
    // Create response object
    const responseData = {
      walletAddress,
      bookings: bookings,
      totalSpent,
      bookingsByType: {
        flight: flightBookings,
        hotel: hotelBookings,
        car: carBookings
      },
      mostRecentBooking,
      memberSince
    };
    
    console.log('User profile response data:', JSON.stringify({
      walletAddress,
      totalSpent,
      bookingCount: bookings.length,
      flightBookings,
      hotelBookings,
      carBookings
    }));
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error retrieving user profile:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve user profile: ${error.message}`
    });
  }
});

// Get platform statistics
app.get('/api/stats', async (req, res) => {
  try {
    let totalBookings, totalUsers, bookings, users;
    
    if (useInMemoryStore) {
      // Use in-memory store
      bookings = inMemoryBookings;
      users = inMemoryUsers;
      totalBookings = bookings.length;
      totalUsers = users.length;
    } else {
      // Use MongoDB
      totalBookings = await Booking.countDocuments();
      totalUsers = await User.countDocuments();
      bookings = await Booking.find().sort({ createdAt: -1 }).lean();
      
      console.log(`Found ${bookings.length} total bookings in the database`);
    }
    
    // Calculate total amount spent on the platform
    const totalSpent = bookings.reduce((sum, booking) => {
      const price = typeof booking.price === 'string' ? parseFloat(booking.price) : (booking.price || 0);
      return sum + price;
    }, 0);
    
    // Count bookings by type
    const flightBookings = bookings.filter(booking => booking.bookingType === 'flight').length;
    const hotelBookings = bookings.filter(booking => booking.bookingType === 'hotel').length;
    const carBookings = bookings.filter(booking => booking.bookingType === 'car').length;
    
    console.log('Booking counts by type:', { flightBookings, hotelBookings, carBookings });
    
    // Get popular destinations (top 5)
    const destinationCounts = {};
    bookings.forEach(booking => {
      if (booking.destination) {
        destinationCounts[booking.destination] = (destinationCounts[booking.destination] || 0) + 1;
      }
    });
    
    const popularDestinations = Object.entries(destinationCounts)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Get popular providers (top 5)
    const providerCounts = {};
    bookings.forEach(booking => {
      if (booking.provider) {
        providerCounts[booking.provider] = (providerCounts[booking.provider] || 0) + 1;
      }
    });
    
    const popularProviders = Object.entries(providerCounts)
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const responseData = {
      totalBookings,
      totalUsers,
      totalSpent,
      bookingsByType: {
        flight: flightBookings,
        hotel: hotelBookings,
        car: carBookings
      },
      popularDestinations,
      popularProviders
    };
    
    console.log('Stats API response data:', JSON.stringify({
      totalBookings,
      totalUsers,
      totalSpent,
      flightBookings,
      hotelBookings,
      carBookings
    }));
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error retrieving statistics:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve statistics: ${error.message}`
    });
  }
});

// Wallet API endpoints

// Process booking and save to MongoDB
app.post('/api/book', async (req, res) => {
  try {
    const { 
      bookingId, walletAddress, bookingType, provider, destination,
      departureDate, returnDate, checkInDate, checkOutDate,
      passengers, guests, totalAmount, transactionHash, isSimulated
    } = req.body;
    
    // Validate required fields
    if (!bookingId || !walletAddress || !bookingType || !provider) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required booking information' 
      });
    }
    
    let newBooking;
    
    if (useInMemoryStore) {
      // Use in-memory store
      newBooking = {
        bookingId,
        walletAddress,
        bookingType,
        provider,
        destination,
        departureDate,
        returnDate,
        checkInDate,
        checkOutDate,
        passengers,
        guests,
        totalAmount,
        transactionHash,
        status: 'confirmed',
        isSimulated: isSimulated || false,
        createdAt: new Date()
      };
      
      inMemoryBookings.push(newBooking);
      
      // Update user's booking history
      let user = inMemoryUsers.find(u => u.walletAddress === walletAddress);
      
      if (!user) {
        user = {
          walletAddress,
          userDID: `did:cheqd:testnet:${walletAddress.substring(0, 8)}`,
          bookings: [bookingId],
          createdAt: new Date()
        };
        inMemoryUsers.push(user);
      } else {
        user.bookings.push(bookingId);
      }
    } else {
      // Use MongoDB
      newBooking = new Booking({
        bookingId,
        walletAddress,
        bookingType,
        provider,
        destination,
        departureDate,
        returnDate,
        checkInDate,
        checkOutDate,
        passengers,
        guests,
        totalAmount,
        transactionHash,
        status: 'confirmed',
        isSimulated: isSimulated || false
      });
      
      await newBooking.save();
      
      // Update user's booking history
      let user = await User.findOne({ walletAddress });
      
      if (!user) {
        user = new User({
          walletAddress,
          userDID: `did:cheqd:testnet:${walletAddress.substring(0, 8)}`,
          bookings: [bookingId]
        });
      } else {
        user.bookings.push(bookingId);
      }
      
      await user.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Booking saved successfully',
      data: newBooking
    });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ success: false, message: 'Failed to save booking' });
  }
});

// Add funds to wallet
app.post('/api/wallet/:address/add-funds', async (req, res) => {
  try {
    const { address } = req.params;
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }
    
    const wallet = await addFunds(address, parseFloat(amount));
    
    return res.status(200).json({
      success: true,
      message: `$${amount} added to wallet successfully`,
      wallet,
    });
  } catch (error) {
    console.error('Error adding funds:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to add funds: ${error.message}`,
    });
  }
});

// Get transaction history
app.get('/api/wallet/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const transactions = await getTransactionHistory(address);
    
    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Error getting transactions:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to get transactions: ${error.message}`,
    });
  }
});

// Price estimation endpoint
app.post('/api/estimate-price', async (req, res) => {
  try {
    console.log('Price estimation request received:', req.body);
    const bookingData = req.body;
    const { destination, budget, bookingType } = bookingData;
    
    console.log(`Processing price estimate for ${bookingType} to ${destination}`);
    
    if (!destination || !bookingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: destination or bookingType',
      });
    }
    
    // Normalize destination
    const normalizedDestination = normalizeDestination(destination);
    
    // Find options for the destination
    console.log(`Available ${bookingType} options:`, travelOptions[bookingType]);
    console.log(`Looking for destination: ${normalizedDestination}`);
    const options = travelOptions[bookingType]?.filter(opt => opt.destination === normalizedDestination);
    console.log('Filtered options:', options);
    
    if (!options || options.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No ${bookingType} options found for ${normalizedDestination}`,
      });
    }
    
    // Find the best option (lowest price)
    const option = options.sort((a, b) => a.price - b.price)[0];
    
    // Get provider address from trust registry
    const provider = trustedProviders.find(p => p.type === bookingType && p.name === option.provider);
    
    return res.status(200).json({
      success: true,
      price: option.price,
      currency: option.currency || 'CHEQ',
      provider: option.provider,
      destination: option.destination,
      providerAddress: provider?.did || 'cheqd1j5sxqstwmjj3xltrfjzx25hr27m5xe694d5j0u',
    });
  } catch (error) {
    console.error('Price estimation error:', error.message);
    return res.status(500).json({
      success: false,
      message: `Price estimation failed: ${error.message}`,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});