const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
require('dotenv').config();

const { createDID, issueVC, checkTrustRegistry } = require('./services/cheqdService');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.BACKEND_URL || 'http://localhost:5173',
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
    { provider: 'Air France', destination: 'Paris', price: 450 },
    { provider: 'Air France', destination: 'Rome', price: 520 },
    { provider: 'British Airways', destination: 'London', price: 380 },
    { provider: 'British Airways', destination: 'New York', price: 650 },
  ],
  hotel: [
    { provider: 'Marriott Hotels', destination: 'Paris', price: 200 },
    { provider: 'Marriott Hotels', destination: 'Rome', price: 180 },
    { provider: 'Hilton Hotels', destination: 'London', price: 220 },
    { provider: 'Hilton Hotels', destination: 'New York', price: 280 },
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

  try {
    const prompt = `
      You are a travel booking AI for a trustworthy booking agent. The user wants a ${type} to ${normalizedDestination} with a budget of $${budget}.
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
    provider: option.provider,
    destination: option.destination,
    price: option.price,
    dates: `${bookingData.departureDate} to ${bookingData.returnDate}`,
    bookingId: `BK-${uuidv4().substring(0, 8).toUpperCase()}`,
  };
}

// API endpoint for booking travel
app.post('/api/book', async (req, res) => {
  try {
    const bookingData = req.body;
    const { destination, budget, bookingType, walletAddress, travelers, departureDate, returnDate } = bookingData;
    console.log('Received booking request:', bookingData);

    // Validate inputs
    if (!destination || !budget || !bookingType || !walletAddress || !departureDate || !returnDate) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: destination, budget, bookingType, walletAddress, departureDate, or returnDate',
      });
    }
    const parsedBudget = parseInt(budget);
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

    // cheqd operations
    let userDID, aiDID, providerDID;
    try {
      userDID = await createDID(`user-${walletAddress.substring(0, 8)}`);
      aiDID = await createDID('ai-agent');
      const provider = trustedProviders.find(
        (p) => p.type === bookingType && p.name === option.provider
      );
      if (!provider) {
        console.log(`Provider ${option.provider} not found in trusted providers list`);
        throw new Error(`Provider ${option.provider} not found in trusted providers list`);
      }
      providerDID = provider.did;
      console.log(`Checking Trust Registry for provider DID: ${providerDID}`);
      const isTrusted = await checkTrustRegistry(providerDID);
      if (!isTrusted) {
        console.log(`Provider ${option.provider} is not verified in the Trust Registry`);
        return res.status(400).json({
          success: false,
          message: `Provider ${option.provider} is not verified in the Trust Registry`,
        });
      }
    } catch (error) {
      console.error('cheqd operation error:', error.message);
      throw error;
    }

    // Create booking details
    const bookingDetails = createBookingDetails(option, bookingData);

    // Issue Verifiable Credential
    let bookingVC;
    try {
      bookingVC = await issueVC(aiDID, userDID, {
        bookingType,
        provider: option.provider,
        providerDID,
        destination: option.destination,
        price: option.price,
        dates: `${bookingData.departureDate} to ${bookingData.returnDate}`,
        bookingId: bookingDetails.bookingId,
        travelers,
        credentialSchema: `${trustRegistry.schemaDID}?resourceName=TravelBookingCredential&resourceType=JSONSchemaValidator2020`,
        termsOfUse: {
          type: "AttestationPolicy",
          parentAccreditation: `${trustRegistry.issuerDID}?resourceName=AccreditationToAttest&resourceType=VerifiableAccreditationToAttest`,
          rootAuthorisation: `${trustRegistry.rootDID}?resourceName=OrganisationAuthorisationForTravelAgents&resourceType=VerifiableAuthorisationForTrustChain`,
        },
      });
    } catch (error) {
      console.error('VC issuance error:', error.message);
      throw error;
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});