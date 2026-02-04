import axios from 'axios';
import { getBackendUrl } from './api-config';

const api = axios.create({
    baseURL: getBackendUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
