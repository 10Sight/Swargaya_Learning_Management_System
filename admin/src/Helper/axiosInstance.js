import axios from "axios";

// const BASE_URL = "https://swargaya-learning-management-system-3vcz.onrender.com"
const BASE_URL = "http://localhost:3000"

const axiosInstance = axios.create();

axiosInstance.defaults.baseURL = BASE_URL
axiosInstance.defaults.withCredentials = true

// Request interceptor - for future authentication token handling
axiosInstance.interceptors.request.use(
    (config) => {
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
        // Handle 401 errors globally if needed
        if (error.response?.status === 401) {
            // Could redirect to login or refresh tokens here
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
