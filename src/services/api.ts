import axios from 'axios';

const api = axios.create({
  baseURL: 'https://prime-pizza-backend.vercel.app'
});

export { api };
