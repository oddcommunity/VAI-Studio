/**
 * Sanitization Utilities
 * Functions to safely handle user-provided data
 */

/**
 * Extract and sanitize file name from a file path
 * Handles both Unix and Windows path separators
 */
export function sanitizeFileName(filePath: string | null | undefined): string {
  if (!filePath || typeof filePath !== 'string') {
    return 'Unknown File'
  }

  // Extract file name from path (handles both / and \ separators)
  const fileName = filePath.split('/').pop()?.split('\\').pop() || filePath

  // Remove any potentially dangerous characters while keeping the file readable
  // Only allow alphanumeric, spaces, dots, hyphens, underscores, and parentheses
  const sanitized = fileName.replace(/[^\w\s.\-()[\]]/g, '_')

  return sanitized || 'Unknown File'
}

/**
 * Sanitize a file path for use in file:// URLs
 * Ensures special characters are properly encoded
 */
export function sanitizeFilePathForUrl(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path')
  }

  // Use encodeURI to handle special characters
  // but preserve the path structure (slashes are not encoded)
  return encodeURI(filePath)
}

/**
 * Validate that a string is a safe file path
 * Returns true if the path appears to be a valid file path
 */
export function isValidFilePath(filePath: string | null | undefined): filePath is string {
  if (!filePath || typeof filePath !== 'string') {
    return false
  }

  // Check for path traversal attempts
  if (filePath.includes('..') && (filePath.includes('../') || filePath.includes('..\\'))) {
    return false
  }

  // Check for null bytes (common injection technique)
  if (filePath.includes('\0')) {
    return false
  }

  return true
}
