// services/auth.service.ts
import { api } from './api';

export const authService = {
  login: async (credentials: { username: string; password: string }) => {
    try {
      console.log('🔐 Enviando login:', credentials.username);
      const response = await api.post('/Auth/login', credentials, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('✅ Login exitoso');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en authService:', error);
      
      // IMPORTANTE: NO crear un nuevo Error, re-lanzar el error original
      // Solo agregar información de depuración
      error._isAuthError = true;
      error._timestamp = new Date().toISOString();
      
      // Re-lanzar el error ORIGINAL para que mantenga la estructura
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  verifyToken: async () => {
    try {
      const response = await api.get('/Auth/verify', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  clearAuth: () => {
    localStorage.clear();
    sessionStorage.clear();
  }
};