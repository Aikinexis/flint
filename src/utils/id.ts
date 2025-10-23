/**
 * Utility functions for generating unique identifiers
 */

/**
 * Generates a UUID v4 compliant unique identifier
 * @returns A unique identifier string
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a short unique identifier (8 characters)
 * Useful for temporary IDs or when full UUID is not needed
 * @returns A short unique identifier string
 */
export function generateShortId(): string {
  return crypto.randomUUID().split('-')[0] || '';
}

/**
 * Generates a prefixed unique identifier
 * @param prefix - The prefix to add to the ID
 * @returns A prefixed unique identifier string
 * @example
 * generatePrefixedId('note') // 'note-550e8400-e29b-41d4-a716-446655440000'
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
