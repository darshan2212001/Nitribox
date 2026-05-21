/**
 * Logging Utility
 * 
 * Centralized logging system with levels and environment-based filtering.
 * In production, only errors are logged. In development, all logs are shown.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  // Safe getter for development mode that checks at runtime
  private get isDevelopment(): boolean {
    return typeof __DEV__ !== 'undefined' && __DEV__ === true;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] [${timestamp}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  private addToHistory(level: LogLevel, message: string, data?: any) {
    this.logHistory.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep history size manageable
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, data);
      console.log(formatted);
      this.addToHistory('debug', message, data);
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, data);
      console.log(formatted);
      this.addToHistory('info', message, data);
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, data);
      console.warn(formatted);
      this.addToHistory('warn', message, data);
    }
  }

  error(message: string, error?: Error | any, data?: any) {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, data);
      console.error(formatted, error);
      this.addToHistory('error', message, { error, ...data });
      
      // In production, you might want to send errors to a logging service
      // Example: Sentry.captureException(error);
    }
  }

  /**
   * Get log history (useful for debugging)
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Export logs (useful for sending to server for debugging)
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: Error | any, data?: any) => logger.error(message, error, data),
};

export default logger;

