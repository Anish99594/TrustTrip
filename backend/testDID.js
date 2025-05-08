const axios = require('axios');
const bs58 = require('bs58');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const CHEQD_STUDIO_URL = process.env.CHEQD_STUDIO_URL || 'https://studio-api.cheqd.net';
const CHEQD_STUDIO_API_KEY = process.env.CHEQD_STUDIO_API_KEY;
const RECOVERY_PHRASE = process.env.RECOVERY_PHRASE;

if (!CHEQD_STUDIO_URL || !CHEQD_STUDIO_API_KEY || !RECOVERY_PHRASE) {
  throw new Error('CHEQD_STUDIO_URL, CHEQD_STUDIO_API_KEY, or RECOVERY_PHRASE is not defined in .env');
}

const cheqdAxios = axios.create({
  baseURL: CHEQD_STUDIO_URL,
  timeout: 600000,
  headers: {
    'x-api-key': CHEQD_STUDIO_API_KEY,
    'Content-Type': 'application/json',
    'accept': 'application/json',
  },
});

async function withRetry(fn, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !error.response || ![429, 503, 504].includes(error.response.status)) {
        throw error;
      }
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms due to ${error.response.status}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function createDID(entityName) {
  return withRetry(async () => {
    try {
      const keyResponse = await cheqdAxios.post('/key/create', { type: 'Ed25519' });
      const publicKey = keyResponse.data.publicKeyHex;
      console.log(`Generated key for ${entityName}: ${publicKey}`);

      if (!/^[0-9a-fA-F]{64}$/.test(publicKey)) {
        throw new Error(`Invalid publicKeyHex format: ${publicKey}`);
      }

      const uuid = uuidv4();
      const tempDID = `did:cheqd:testnet:${uuid}`;
      const publicKeyBytes = Buffer.from(publicKey, 'hex');
      const multicodecEd25519 = Buffer.concat([Buffer.from([0xED, 0x01]), publicKeyBytes]);
      const bs58Encode = bs58.encode || (bs58.default && bs58.default.encode);
      if (!bs58Encode) {
        throw new Error('bs58 encode function not found');
      }
      const publicKeyMultibase = `z${bs58Encode(multicodecEd25519)}`;

      const payload = {
        network: 'testnet',
        identifierFormatType: 'uuid',
        assertionMethod: true,
        mnemonic: RECOVERY_PHRASE,
        options: {
          key: publicKey,
          verificationMethodType: 'Ed25519VerificationKey2020',
        },
        didDocument: {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: tempDID,
          controller: [tempDID],
          verificationMethod: [{
            id: `${tempDID}#key-1`,
            type: 'Ed25519VerificationKey2020',
            controller: tempDID,
            publicKeyMultibase: publicKeyMultibase,
          }],
          authentication: [`${tempDID}#key-1`],
          service: [{
            id: `${tempDID}#service-1`,
            type: 'LinkedDomains',
            serviceEndpoint: ['https://example.com'],
          }],
        },
      };

      const response = await cheqdAxios.post('/did/create', payload);
      const did = response.data.did;
      console.log(`Created DID for ${entityName}: ${did}`);
      return did;
    } catch (error) {
      console.error(`Error creating DID for ${entityName}:`, error.response?.data?.error || error.message);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  });
}

createDID('test-agent')
  .then((did) => {
    console.log('DID created successfully:', did);
    process.exit(0);
  })
  .catch((error) => {
    console.error('DID creation failed:', error);
    process.exit(1);
  });