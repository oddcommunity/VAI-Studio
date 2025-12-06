/**
 * Browser-compatible crypto shim using Web Crypto API
 * Replaces Node.js crypto module in browser environment
 */

export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return bytes
}

export function randomUUID(): string {
  return crypto.randomUUID()
}

// Export as default for compatibility
export default {
  randomBytes,
  randomUUID,
  getRandomValues: (array: Uint8Array) => crypto.getRandomValues(array),
}
