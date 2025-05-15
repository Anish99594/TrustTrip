const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
require('dotenv').config();

const { createDID, issueVC, checkTrustRegistry } = require('./services/cheqdService');
const { getWallet, createOrUpdateWallet, addFunds, makePayment, getTransactionHistory } = require('./services/walletService');

const app = express();
const PORT = process.env.PORT || 3001;

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

  try {
    const prompt = `
      You are a travel booking AI for a trustworthy booking agent. The user wants a ${type} to ${normalizedDestination} with a budget of ${budget} CHEQ.
      Available options:
      ${JSON.stringify(travelOptions[type].filter(opt => opt.destination === normalizedDestination), null, 2)}
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
    // Fallback to rule-based selection
    const options = travelOptions[type].filter(
      (opt) => opt.destination === normalizedDestination && opt.price <= budget
    );
    console.log('Fallback options:', options);

    if (options.length === 0) {
      console.log(`No options found for ${type} to ${normalizedDestination} within budget $${budget}`);
      return null;
    }
    const scoredOptions = options.map((opt) => ({
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

// API endpoint for booking travel
app.post('/api/book', async (req, res) => {
  try {
    const bookingData = req.body;
    const { destination, budget, bookingType, walletAddress, travelers, departureDate, returnDate, simulatedPayment, transactionHash } = bookingData;
    
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

    // Return booking confirmation
    console.log('Booking successful:', bookingDetails);
    return res.status(200).json({
      success: true,
      message: `Your ${bookingType} has been booked successfully!`,
      details: bookingDetails,
      credential: bookingVC,
    });
  } catch (error) {
    console.error('Booking error:', error.message);
    return res.status(500).json({
      success: false,
      message: `Booking failed: ${error.message}`,
    });
  }
});

// Wallet API endpoints

// Get wallet info
app.get('/api/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const wallet = await getWallet(address);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error('Error getting wallet:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to get wallet: ${error.message}`,
    });
  }
});

// Create or update wallet
app.post('/api/wallet', async (req, res) => {
  try {
    const { address, initialBalance } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
    }
    
    const wallet = await createOrUpdateWallet(address, initialBalance);
    
    return res.status(200).json({
      success: true,
      message: 'Wallet created or updated successfully',
      wallet,
    });
  } catch (error) {
    console.error('Error creating wallet:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to create wallet: ${error.message}`,
    });
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