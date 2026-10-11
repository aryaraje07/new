import { useState, useEffect, useCallback } from 'react';
import { apiConfig, createApiUrl, postOptions, fetchOptions, handleApiError } from '@/lib/api-config';

// Custom hook for API calls with error handling
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = createApiUrl(endpoint);
      const response = await fetch(url, {
        ...fetchOptions,
        ...options,
        timeout: apiConfig.timeout,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  }, []);

  const post = useCallback(async (endpoint, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = createApiUrl(endpoint);
      const response = await fetch(url, postOptions(data));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  }, []);

  const put = useCallback(async (endpoint, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = createApiUrl(endpoint);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  }, []);

  const del = useCallback(async (endpoint) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = createApiUrl(endpoint);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    request,
    post,
    put,
    delete: del,
    loading,
    error,
    clearError: () => setError(null),
  };
};

// Hook for authenticated requests
export const useAuthenticatedApi = () => {
  const api = useApi();
  
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const authenticatedRequest = useCallback(async (endpoint, options = {}) => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    };

    return api.request(endpoint, authOptions);
  }, [api]);

  const authenticatedPost = useCallback(async (endpoint, data) => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const authOptions = postOptions(data);
    authOptions.headers['Authorization'] = `Bearer ${token}`;

    return api.post(endpoint, data, authOptions);
  }, [api]);

  const authenticatedPut = useCallback(async (endpoint, data) => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const authOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      credentials: 'include',
      mode: 'cors',
    };

    return api.request(endpoint, authOptions);
  }, [api]);

  const authenticatedDelete = useCallback(async (endpoint) => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const authOptions = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      mode: 'cors',
    };

    return api.request(endpoint, authOptions);
  }, [api]);

  return {
    ...api,
    authenticatedRequest,
    authenticatedPost,
    authenticatedPut,
    authenticatedDelete,
  };
};
