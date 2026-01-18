import axios from 'axios';

// 1. Create the Axios Instance
const api = axios.create({
    baseURL: '/api', // Your Flask URL
});

// 2. The Interceptor (The Security Guard)
// Before every request, check if we have a token and attach it.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. The Error Handler
// If the token is expired (401), kick the user out.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;