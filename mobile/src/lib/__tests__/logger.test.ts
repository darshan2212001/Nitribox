import { logger, log } from '../logger';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.clearHistory();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('in development mode', () => {
    beforeAll(() => {
      // Assume __DEV__ is true
    });

    it('should log debug messages', () => {
      log.debug('Test debug message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      log.info('Test info message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      log.warn('Test warn message');
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      log.error('Test error message', error);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('log history', () => {
    it('should maintain log history', () => {
      log.info('Test message');
      const history = logger.getHistory();
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].message).toBe('Test message');
      expect(history[0].level).toBe('info');
    });

    it('should clear log history', () => {
      log.info('Test message');
      logger.clearHistory();
      const history = logger.getHistory();
      
      expect(history.length).toBe(0);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 150; i++) {
        log.info(`Message ${i}`);
      }
      
      const history = logger.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('export logs', () => {
    it('should export logs as JSON', () => {
      log.info('Test message');
      const exported = logger.exportLogs();
      
      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });
});

