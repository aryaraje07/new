// API Configuration for different environments
const getApiConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isDevelopment) {
    return {
      apiUrl: 'http://localhost:5000',
      wsUrl: 'ws://localhost:5000',
      timeout: 10000,
    };
  }
  
  if (isProduction) {
    const productionApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-domain.onrender.com';
    return {
      apiUrl: productionApiUrl,
      wsUrl: productionApiUrl.replace('https', 'wss').replace('http', 'ws'),
      timeout: 15000,
    };
  }
  
  // Fallback for other environments
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    wsUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('https', 'wss').replace('http', 'ws'),
    timeout: 10000,
  };
};

export const apiConfig = getApiConfig();

// API helper functions
export const createApiUrl = (endpoint) => {
  return `${apiConfig.apiUrl}${endpoint}`;
};

export const createWebSocketUrl = (endpoint) => {
  return `${apiConfig.wsUrl}${endpoint}`;
};

// Common fetch options with CORS
export const fetchOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include',
  mode: 'cors',
};

export const postOptions = (data) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify(data),
  credentials: 'include',
  mode: 'cors',
});

// Error handling helper
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'Server error',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1,
    };
  }
};
