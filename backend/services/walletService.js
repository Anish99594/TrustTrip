const fs = require('fs').promises;
const path = require('path');

// Path to wallet data file
const WALLET_FILE = path.join(__dirname, '../data/wallets.json');

// Ensure the data directory exists
async function ensureDataDir() {
  const dataDir = path.join(__dirname, '../data');
  try {
    await fs.access(dataDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Initialize wallet file if it doesn't exist
async function initWalletFile() {
  try {
    await fs.access(WALLET_FILE);
  } catch (error) {
    // File doesn't exist, create it with empty wallets object
    await ensureDataDir();
    await fs.writeFile(WALLET_FILE, JSON.stringify({ wallets: {} }), 'utf8');
  }
}

// Get all wallets
async function getWallets() {
  await initWalletFile();
  const data = await fs.readFile(WALLET_FILE, 'utf8');
  return JSON.parse(data).wallets;
}

// Save wallets to file
async function saveWallets(wallets) {
  await ensureDataDir();
  await fs.writeFile(WALLET_FILE, JSON.stringify({ wallets }, null, 2), 'utf8');
}

// Get wallet by address
async function getWallet(address) {
  const wallets = await getWallets();
  return wallets[address] || null;
}

// Create or update wallet
async function createOrUpdateWallet(address, balance = 0.001) {
  const wallets = await getWallets();
  
  // If wallet doesn't exist, create it with default balance
  if (!wallets[address]) {
    wallets[address] = {
      address,
      balance,
      transactions: []
    };
  }
  
  await saveWallets(wallets);
  return wallets[address];
}

// Add funds to wallet
async function addFunds(address, amount) {
  const wallets = await getWallets();
  
  if (!wallets[address]) {
    throw new Error(`Wallet with address ${address} not found`);
  }
  
  wallets[address].balance = parseFloat((wallets[address].balance + amount).toFixed(8));
  wallets[address].transactions.push({
    type: 'deposit',
    amount,
    timestamp: new Date().toISOString()
  });
  
  await saveWallets(wallets);
  return wallets[address];
}

// Make payment from wallet
async function makePayment(address, amount, description) {
  const wallets = await getWallets();
  
  if (!wallets[address]) {
    throw new Error(`Wallet with address ${address} not found`);
  }
  
  if (wallets[address].balance < amount) {
    throw new Error('Insufficient funds');
  }
  
  wallets[address].balance = parseFloat((wallets[address].balance - amount).toFixed(8));
  wallets[address].transactions.push({
    type: 'payment',
    amount: -amount,
    description,
    timestamp: new Date().toISOString()
  });
  
  await saveWallets(wallets);
  return wallets[address];
}

// Get transaction history for a wallet
async function getTransactionHistory(address) {
  const wallet = await getWallet(address);
  
  if (!wallet) {
    throw new Error(`Wallet with address ${address} not found`);
  }
  
  return wallet.transactions;
}

module.exports = {
  getWallet,
  createOrUpdateWallet,
  addFunds,
  makePayment,
  getTransactionHistory
};
