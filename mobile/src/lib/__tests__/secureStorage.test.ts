import * as SecureStore from 'expo-secure-store';
import { setSecureItem, getSecureItem, removeSecureItem, isSecureStorageAvailable } from '../secureStorage';

jest.mock('expo-secure-store');

describe('SecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setSecureItem', () => {
    it('should store item successfully', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
      
      const result = await setSecureItem('test-key', 'test-value');
      
      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('test-key', 'test-value', {});
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const result = await setSecureItem('test-key', 'test-value');
      
      expect(result).toBe(false);
    });
  });

  describe('getSecureItem', () => {
    it('should retrieve item successfully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-value');
      
      const result = await getSecureItem('test-key');
      
      expect(result).toBe('test-value');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('test-key', {});
    });

    it('should return null on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const result = await getSecureItem('test-key');
      
      expect(result).toBeNull();
    });
  });

  describe('removeSecureItem', () => {
    it('should remove item successfully', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      
      const result = await removeSecureItem('test-key');
      
      expect(result).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const result = await removeSecureItem('test-key');
      
      expect(result).toBe(false);
    });
  });

  describe('isSecureStorageAvailable', () => {
    it('should return true when storage is available', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test');
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      
      const result = await isSecureStorageAvailable();
      
      expect(result).toBe(true);
    });

    it('should return false when storage is not available', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Not available'));
      
      const result = await isSecureStorageAvailable();
      
      expect(result).toBe(false);
    });
  });
});

