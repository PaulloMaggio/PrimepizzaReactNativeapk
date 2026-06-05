import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';

type AuthContextData = {
  user: UserProps | null;
  isAuthenticated: boolean;
  signIn: (credentials: SignInProps) => Promise<void>;
  loadingAuth: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

type UserProps = {
  id: string;
  name: string;
  email: string;
  token: string;
}

type AuthProviderProps = {
  children: ReactNode;
}

type SignInProps = {
  email: string;
  password: string;
}

export const AuthContext = createContext({} as AuthContextData);

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = base64.replace(/=+$/, '');
    let output = '';
    
    for (let bc = 0, bs = 0, r1, r2, i = 0; (r2 = str.charAt(i++)); ) {
      r2 = chars.indexOf(r2);
      if (~r2) {
        bs = bc % 4 ? bs * 64 + r2 : r2;
        if (bc++ % 4) {
          r1 = (bs >> ((-2 * bc) & 6));
          output += String.fromCharCode(255 & r1);
        }
      }
    }
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({children}: AuthProviderProps){
  const [user, setUser] = useState<UserProps | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    async function getUser(){
      const userInfo = await AsyncStorage.getItem('@sujeitopizzaria');

      if (userInfo) {
        let hasUser: UserProps = JSON.parse(userInfo);
        api.defaults.headers.common['Authorization'] = `Bearer ${hasUser.token}`;
        setUser(hasUser);
      }
      setLoading(false);
    }
    getUser();
  }, []);

  async function signIn({ email, password }: SignInProps){
    setLoadingAuth(true);

    try {
      const response = await api.post('/session', { email, password });
      const { token } = response.data;

      if (!token) {
        throw new Error('Token de autenticação não encontrado.');
      }

      const decoded = decodeJwt(token);

      if (!decoded) {
        throw new Error('Falha ao decodificar o token.');
      }

      const dataToSave = { 
        id: decoded.sub, 
        name: decoded.name, 
        email: decoded.email || email, 
        token 
      };

      await AsyncStorage.setItem('@sujeitopizzaria', JSON.stringify(dataToSave));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(dataToSave);

    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as any).response === 'object' &&
        (err as any).response !== null &&
        'status' in (err as any).response &&
        (err as any).response.status === 400
      ) {
        Alert.alert('Ops!', 'Email ou senha incorretos.');
      }
      console.log('Erro ao acessar:', err);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function signOut(){
    await AsyncStorage.clear();
    setUser(null);
  }

  return(
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated, 
        signIn, 
        loading, 
        loadingAuth,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}