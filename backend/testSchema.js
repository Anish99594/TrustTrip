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
  timeout: 120000,
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
      const isRetryable = error.code === 'ECONNABORTED' || (error.response && [400, 429, 503, 504].includes(error.response.status));
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms due to ${error.code || error.response.status}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function createDID(entityName) {
  return withRetry(async () => {
    const keyResponse = await cheqdAxios.post('/key/create', { type: 'Ed25519' });
    const publicKey = keyResponse.data.publicKeyHex;
    if (!/^[0-9a-fA-F]{64}$/.test(publicKey)) {
      throw new Error(`Invalid publicKeyHex: ${publicKey}`);
    }

    const uuid = uuidv4();
    const tempDID = `did:cheqd:testnet:${uuid}`;
    const publicKeyBytes = Buffer.from(publicKey, 'hex');
    const multicodecEd25519 = Buffer.concat([Buffer.from([0xED, 0x01]), publicKeyBytes]);
    const publicKeyMultibase = `z${bs58.default.encode(multicodecEd25519)}`;

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
      },
    };

    const response = await cheqdAxios.post('/did/create', payload);
    return response.data.did;
  });
}

async function createSchema() {
  return withRetry(async () => {
    try {
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'TravelBookingCredential',
        type: 'object',
        properties: {
          bookingType: { type: 'string', enum: ['flight', 'hotel'] },
          provider: { type: 'string' },
        },
        required: ['bookingType', 'provider'],
      };

      const payload = {
        network: 'testnet',
        mnemonic: RECOVERY_PHRASE,
        schema: schema,
        resourceMetadata: {
          resourceName: 'TravelBookingCredential',
          resourceType: 'JSONSchema2023',
          version: '1.0',
        },
      };

      console.log('Creating schema with payload:', JSON.stringify(payload, null, 2));
      const response = await cheqdAxios.post('/resource/create', payload);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      const schemaDID = response.data.resource.did;
      console.log(`Created schema DID: ${schemaDID}`);
      return schemaDID;
    } catch (error) {
      console.error('Error creating schema:', error.response?.data || error.message);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  });
}

async function main() {
  try {
    console.log('Creating new DID for schema...');
    const did = await createDID('schema-agent');
    console.log(`Created DID: ${did}`);
    const schemaDID = await createSchema();
    console.log('Schema created successfully:', schemaDID);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

main();