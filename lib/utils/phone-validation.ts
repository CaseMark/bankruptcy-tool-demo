/**
 * Phone number validation and formatting utilities for US phone numbers
 */

/**
 * Validates if a string is a valid US phone number
 * Accepts various formats: (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567, +15551234567
 * @param phone - Phone number string to validate
 * @returns true if valid US phone number, false otherwise
 */
export function validateUSPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's 10 digits (US format) or 11 digits starting with 1 (with country code)
  if (digitsOnly.length === 10) {
    // Valid 10-digit US number
    return isValidAreaCode(digitsOnly.substring(0, 3));
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Valid 11-digit number with country code
    return isValidAreaCode(digitsOnly.substring(1, 4));
  }

  return false;
}

/**
 * Validates if an area code is valid
 * Rejects: 000, 555 (reserved for fiction), and N11 codes
 * @param areaCode - 3-digit area code string
 * @returns true if valid area code
 */
function isValidAreaCode(areaCode: string): boolean {
  if (areaCode.length !== 3) return false;

  const code = parseInt(areaCode, 10);

  // Reject invalid codes
  if (code === 0 || code === 555) return false;

  // Reject N11 codes (211, 311, 411, 511, 611, 711, 811, 911)
  if (areaCode.endsWith('11')) return false;

  // First digit cannot be 0 or 1
  if (areaCode[0] === '0' || areaCode[0] === '1') return false;

  return true;
}

/**
 * Formats a phone number to E.164 format (+1XXXXXXXXXX)
 * @param phone - Phone number in any common US format
 * @returns E.164 formatted phone number or empty string if invalid
 */
export function formatToE164(phone: string): string {
  if (!validateUSPhoneNumber(phone)) {
    return '';
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // If it's 10 digits, add the country code
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If it's 11 digits starting with 1, format as E.164
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  return '';
}

/**
 * Formats a phone number for display: (555) 123-4567
 * @param phone - Phone number in any common US format or E.164
 * @returns Formatted phone number for display or original string if invalid
 */
export function formatForDisplay(phone: string): string {
  if (!phone) return '';

  // Try to validate and extract digits
  const digitsOnly = phone.replace(/\D/g, '');

  let phoneDigits = '';

  if (digitsOnly.length === 10) {
    phoneDigits = digitsOnly;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    phoneDigits = digitsOnly.substring(1);
  } else {
    // Return original if we can't parse it
    return phone;
  }

  // Format as (XXX) XXX-XXXX
  const areaCode = phoneDigits.substring(0, 3);
  const prefix = phoneDigits.substring(3, 6);
  const lineNumber = phoneDigits.substring(6, 10);

  return `(${areaCode}) ${prefix}-${lineNumber}`;
}

/**
 * Extracts just the digits from a phone number string
 * @param phone - Phone number string
 * @returns String containing only digits
 */
export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Checks if a phone number is in E.164 format
 * @param phone - Phone number string
 * @returns true if in E.164 format (+1XXXXXXXXXX)
 */
export function isE164Format(phone: string): boolean {
  if (!phone) return false;
  return /^\+1\d{10}$/.test(phone);
}
