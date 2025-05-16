const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true
  },
  bookingType: {
    type: String,
    required: true,
    enum: ['flight', 'hotel', 'car']
  },
  provider: {
    type: String,
    required: true
  },
  providerDID: {
    type: String
  },
  destination: {
    type: String,
    required: true
  },
  departureDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'CHEQ'
  },
  travelers: {
    type: Number,
    default: 1
  },
  walletAddress: {
    type: String,
    required: true
  },
  transactionHash: {
    type: String
  },
  simulatedPayment: {
    type: Boolean,
    default: false
  },
  userDID: {
    type: String
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
