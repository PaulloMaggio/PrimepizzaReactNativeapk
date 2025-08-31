import React, { useState, createContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { Alert } from 'react-native'; // Adicionando o Alert

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
  token: string
}

type AuthProviderProps = {
  children: ReactNode;
}

type SignInProps = {
  email: string;
  password: string;
}

export const AuthContext = createContext({} as AuthContextData);

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
      
      const { id, name, token } = response.data;

      if (!token) {
        // Se a API não retornar um token, lançamos um erro para ir para o bloco catch
        throw new Error('Token de autenticação não encontrado.');
      }

      const dataToSave = { id, name, email, token };
      await AsyncStorage.setItem('@sujeitopizzaria', JSON.stringify(dataToSave));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(dataToSave);

    } catch (err) {
      // Verifica se o erro é do tipo Axios e tem a resposta do servidor
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