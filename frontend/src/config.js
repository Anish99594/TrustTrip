// Environment configuration
export const config = {
  // AI Configuration
  ai: {
    enabled: import.meta.env.VITE_AI_ENABLED === 'true',
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  },
  
  // API Endpoints
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://trusttrip.onrender.com/api',
  },
  
  // App Settings
  app: {
    name: 'TrustTrip',
    version: '1.0.0',
  },
};

// Validate required environment variables
export function validateEnv() {
  const requiredVars = ['VITE_OPENAI_API_KEY'];
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars.join(', '));
    return false;
  }
  return true;
}

// Export a function to check if AI is enabled and configured
export function isAIAvailable() {
  return config.ai.enabled && !!config.ai.openaiApiKey;
}
