import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuth, AuthProvider } from '../useAuth';
import apiClient from '../../lib/apiClient';
import { getSecureItem, setSecureItem, removeSecureItem } from '../../lib/secureStorage';

jest.mock('../../lib/apiClient');
jest.mock('../../lib/secureStorage');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
      });
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'client',
        },
      });
      (setSecureItem as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(async () => {
        const loginResult = await result.current.login('test@example.com', 'password');
        expect(loginResult.success).toBe(true);
      });

      expect(setSecureItem).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(setSecureItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    });

    it('should handle login errors', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({
        response: {
          data: { detail: 'Invalid credentials' },
        },
      });
      (removeSecureItem as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(async () => {
        const loginResult = await result.current.login('test@example.com', 'wrong-password');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Invalid credentials');
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      (getSecureItem as jest.Mock).mockResolvedValue('refresh-token');
      (apiClient.post as jest.Mock).mockResolvedValue({});
      (removeSecureItem as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(async () => {
        await result.current.logout();
        expect(removeSecureItem).toHaveBeenCalledWith('auth_token');
        expect(removeSecureItem).toHaveBeenCalledWith('refresh_token');
      });
    });
  });
});

