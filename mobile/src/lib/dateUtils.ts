/**
 * Date Utility Functions
 * 
 * Safe date parsing and formatting utilities to prevent "Invalid Date" errors
 */

/**
 * Safely parse a date string and return a Date object or null
 */
export function safeParseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Safely format a date to locale date string
 */
export function safeFormatDate(dateString: string | undefined | null): string {
  const date = safeParseDate(dateString);
  if (!date) return 'N/A';
  
  try {
    return date.toLocaleDateString();
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Safely format a date to locale time string
 */
export function safeFormatTime(dateString: string | undefined | null): string {
  const date = safeParseDate(dateString);
  if (!date) return 'N/A';
  
  try {
    return date.toLocaleTimeString();
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Safely format a date to locale date and time string
 */
export function safeFormatDateTime(dateString: string | undefined | null): string {
  const date = safeParseDate(dateString);
  if (!date) return 'N/A';
  
  try {
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Get current ISO string safely
 */
export function getCurrentISOString(): string {
  return new Date().toISOString();
}

