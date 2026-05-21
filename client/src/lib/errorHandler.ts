/**
 * Standardized error handling utilities for the frontend
 */

export interface ApiError {
  message: string;
  statusCode?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiErrorHandler {
  /**
   * Parse error from API response
   */
  static parseError(error: unknown): ApiError {
    if (error instanceof Error) {
      // Check if it's a fetch error with response
      if ('response' in error) {
        const fetchError = error as { response?: Response };
        if (fetchError.response) {
          return {
            message: error.message,
            statusCode: fetchError.response.status,
            detail: error.message,
          };
        }
      }
      
      return {
        message: error.message,
        detail: error.message,
      };
    }
    
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      return {
        message: (errObj.message as string) || 'An unexpected error occurred',
        statusCode: errObj.statusCode as number | undefined,
        detail: (errObj.detail as string) || (errObj.message as string),
        errors: errObj.errors as Record<string, string[]> | undefined,
      };
    }
    
    return {
      message: 'An unexpected error occurred',
      detail: String(error),
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    const parsed = this.parseError(error);
    
    // Handle specific status codes
    if (parsed.statusCode === 401) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (parsed.statusCode === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    if (parsed.statusCode === 404) {
      return 'The requested resource was not found.';
    }
    
    if (parsed.statusCode === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (parsed.statusCode === 500) {
      return 'A server error occurred. Please try again later.';
    }
    
    if (parsed.statusCode === 503) {
      return 'Service is temporarily unavailable. Please try again later.';
    }
    
    // Return detail if available, otherwise message
    return parsed.detail || parsed.message;
  }

  /**
   * Get detailed error message for logging/debugging
   */
  static getDetailedMessage(error: unknown): string {
    const parsed = this.parseError(error);
    const parts: string[] = [];
    
    if (parsed.statusCode) {
      parts.push(`Status: ${parsed.statusCode}`);
    }
    
    if (parsed.message) {
      parts.push(`Message: ${parsed.message}`);
    }
    
    if (parsed.detail && parsed.detail !== parsed.message) {
      parts.push(`Detail: ${parsed.detail}`);
    }
    
    if (parsed.errors) {
      const errorMessages = Object.entries(parsed.errors)
        .flatMap(([field, messages]) => 
          messages.map(msg => `${field}: ${msg}`)
        );
      parts.push(`Validation Errors: ${errorMessages.join(', ')}`);
    }
    
    return parts.join(' | ') || 'Unknown error';
  }

  /**
   * Check if error is network-related
   */
  static isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    const parsed = this.parseError(error);
    return parsed.message.toLowerCase().includes('network') ||
           parsed.message.toLowerCase().includes('failed to fetch');
  }

  /**
   * Check if error is authentication-related
   */
  static isAuthError(error: unknown): boolean {
    const parsed = this.parseError(error);
    return parsed.statusCode === 401 || parsed.statusCode === 403;
  }

  /**
   * Handle error with logging and user notification
   */
  static handleError(
    error: unknown,
    context?: string,
    onNotify?: (message: string) => void
  ): void {
    const userMessage = this.getUserMessage(error);
    const detailedMessage = this.getDetailedMessage(error);
    
    // Log for debugging
    console.error(`[ErrorHandler${context ? `: ${context}` : ''}]`, {
      error,
      parsed: this.parseError(error),
      userMessage,
      detailedMessage,
      isNetworkError: this.isNetworkError(error),
      isAuthError: this.isAuthError(error),
    });
    
    // Notify user if callback provided
    if (onNotify) {
      onNotify(userMessage);
    }
  }
}

/**
 * Hook for handling errors in React components
 */
export function useErrorHandler() {
  return {
    parseError: ApiErrorHandler.parseError,
    getUserMessage: ApiErrorHandler.getUserMessage,
    getDetailedMessage: ApiErrorHandler.getDetailedMessage,
    isNetworkError: ApiErrorHandler.isNetworkError,
    isAuthError: ApiErrorHandler.isAuthError,
    handleError: ApiErrorHandler.handleError,
  };
}

