import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const axiosInstance = axios.create({ baseURL: BASE_URL, withCredentials: true });

// Request interceptor - for authentication token handling
axiosInstance.interceptors.request.use(
    (config) => {
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
