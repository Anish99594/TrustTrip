const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import MongoDB models
const Booking = require('../models/Booking');
const User = require('../models/User');

// Sample data
const sampleBookings = [
  {
    bookingId: 'flight-' + uuidv4().substring(0, 8),
    walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
    bookingType: 'flight',
    provider: 'British Airways',
    destination: 'London',
    departureDate: new Date('2025-06-01'),
    returnDate: new Date('2025-06-07'),
    travelers: 1,
    price: 0.00007,
    transactionHash: 'B7904C90B63EFF0F95D0BB9F8BE40245D2FEF258BA98D433055AA094D4286ED2',
    bookingStatus: 'confirmed',
    simulatedPayment: false,
    createdAt: new Date('2025-05-10')
  },
  {
    bookingId: 'hotel-' + uuidv4().substring(0, 8),
    walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
    bookingType: 'hotel',
    provider: 'Marriott Hotels',
    destination: 'Paris',
    departureDate: new Date('2025-07-15'),  // Using checkInDate as departureDate
    returnDate: new Date('2025-07-20'),     // Using checkOutDate as returnDate
    travelers: 2,
    price: 0.00012,
    transactionHash: 'SIMULATED_TX_HASH_123',
    bookingStatus: 'confirmed',
    simulatedPayment: true,
    createdAt: new Date('2025-05-12')
  },
  {
    bookingId: 'car-' + uuidv4().substring(0, 8),
    walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
    bookingType: 'car',
    provider: 'Hertz',
    destination: 'Berlin',
    departureDate: new Date('2025-08-05'),  // Using pickupDate as departureDate
    returnDate: new Date('2025-08-10'),     // Using returnDate as is
    travelers: 1,
    price: 0.00005,
    transactionHash: 'SIMULATED_TX_HASH_456',
    bookingStatus: 'confirmed',
    simulatedPayment: true,
    createdAt: new Date('2025-05-15')
  },
  {
    bookingId: 'flight-' + uuidv4().substring(0, 8),
    walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
    bookingType: 'flight',
    provider: 'Emirates',
    destination: 'Dubai',
    departureDate: new Date('2025-09-10'),
    returnDate: new Date('2025-09-20'),
    travelers: 2,
    price: 0.00015,
    transactionHash: 'SIMULATED_TX_HASH_789',
    bookingStatus: 'confirmed',
    simulatedPayment: true,
    createdAt: new Date('2025-05-18')
  },
  {
    bookingId: 'hotel-' + uuidv4().substring(0, 8),
    walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
    bookingType: 'hotel',
    provider: 'Hilton',
    destination: 'New York',
    departureDate: new Date('2025-10-05'),  // Using checkInDate as departureDate
    returnDate: new Date('2025-10-10'),     // Using checkOutDate as returnDate
    travelers: 1,
    price: 0.00010,
    transactionHash: 'SIMULATED_TX_HASH_012',
    bookingStatus: 'confirmed',
    simulatedPayment: true,
    createdAt: new Date('2025-05-20')
  }
];

// Sample user data
const sampleUser = {
  walletAddress: 'cheqd1d0v2gzwgvzvmw4mgeypt03l2xln56yzfhhdu5p',
  userDID: 'did:cheqd:testnet:user123',
  createdAt: new Date('2025-05-01')
};

// Connect to MongoDB
const connectAndPopulate = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Booking.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Insert sample bookings
    const insertedBookings = await Booking.insertMany(sampleBookings);
    console.log(`Inserted ${insertedBookings.length} bookings`);

    // Insert sample user
    const insertedUser = await User.create(sampleUser);
    console.log('Inserted user:', insertedUser.walletAddress);

    console.log('Database populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
};

connectAndPopulate();
