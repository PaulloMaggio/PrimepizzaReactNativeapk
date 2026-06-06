import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://prime-pizza-backend.vercel.app'
});

api.interceptors.request.use(async (config) => {
  try {
    const userInfo = await AsyncStorage.getItem('@sujeitopizzaria');
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.log(err);
  }
  return config;
});

export { api };
