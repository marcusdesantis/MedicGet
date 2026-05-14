/**
 * storage.ts — wrapper sobre SecureStore para el JWT con fallback a
 * AsyncStorage (web/dev) cuando SecureStore no está disponible.
 *
 * SecureStore guarda el token en Keychain (iOS) / EncryptedSharedPreferences
 * (Android), que es lo correcto para credenciales sensibles. Sin embargo
 * SecureStore NO funciona en `expo start --web`, así que detectamos eso y
 * caemos a AsyncStorage transparentemente.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'medicget_token';

function useSecure(): boolean {
  // SecureStore no soporta web — usar AsyncStorage en su lugar.
  return Platform.OS !== 'web';
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      if (useSecure()) {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async set(token: string): Promise<void> {
    try {
      if (useSecure()) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      }
    } catch {
      /* swallow — el usuario verá sesión no persistida en próximo arranque */
    }
  },

  async clear(): Promise<void> {
    try {
      if (useSecure()) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* ignore */
    }
  },
};
