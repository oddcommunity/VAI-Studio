/**
 * Odd-Core Integration Module
 * Initializes and manages Odd-Core services for VAI Studio
 */

const { Logger } = require('@odd-core/log');
const { ApiClient } = require('@odd-core/api');

// Initialize logger for VAI Studio
const logger = new Logger({
  service: 'vai-studio',
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

// Initialize API client for potential future backend communication
// This is configured but not required for current local-only functionality
let apiClient = null;

function initializeApiClient(baseURL) {
  if (!baseURL) {
    logger.warn('No API base URL provided, API client not initialized');
    return null;
  }

  try {
    apiClient = new ApiClient({
      baseURL,
      timeout: 30000,
      retries: 3,
      headers: {
        'X-Client': 'VAI-Studio',
        'X-Client-Version': '3.0.1'
      }
    });
    logger.info('API client initialized successfully', { baseURL });
    return apiClient;
  } catch (error) {
    logger.error('Failed to initialize API client', { error: error.message });
    return null;
  }
}

function getLogger() {
  return logger;
}

function getApiClient() {
  return apiClient;
}

module.exports = {
  logger,
  getLogger,
  initializeApiClient,
  getApiClient
};
