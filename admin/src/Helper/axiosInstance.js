import axios from "axios";

const ENV_BASE = import.meta?.env?.VITE_API_BASE_URL;
// const BASE_URL = ENV_BASE || "https://swargaya-learning-management-system-3vcz.onrender.com";
const BASE_URL = "https://swargaya-learning-management-system-3vcz.onrender.com";
// For local dev, set VITE_API_BASE_URL in admin/.env to https://swargaya-learning-management-system-3vcz.onrender.com

const axiosInstance = axios.create({ baseURL: BASE_URL, withCredentials: true });

// Request interceptor - for authentication token handling
axiosInstance.interceptors.request.use(
    (config) => {
        // Since we're using HTTP-only cookies for authentication,
        // we don't need to manually set Authorization headers.
        // The cookies will be sent automatically with each request.
        
        // However, if there's a token in localStorage (for fallback),
        // we can still use it
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - for handling auth errors globally
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('Axios Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        
        // Handle 401 errors globally if needed
        if (error.response?.status === 401) {
            console.warn('Unauthorized request - token may be invalid or expired');
            // Could redirect to login or refresh tokens here
        }
        
        // Handle 404 errors
        if (error.response?.status === 404) {
            console.warn('API endpoint not found:', error.config?.url);
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;
