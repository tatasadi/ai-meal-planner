// Edge-compatible sanitization (DOMPurify doesn't work in Edge runtime)
// Simple but effective sanitization for basic security

/**
 * Sanitize user input to prevent XSS attacks (Edge runtime compatible)
 * @param input - The user input to sanitize
 * @param level - Sanitization level: 'text', 'basic', or 'rich'
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(input: string, level: "text" | "basic" | "rich" = "text"): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  // Trim whitespace
  let sanitized = input.trim()
  if (!sanitized) {
    return ""
  }

  // Basic HTML escaping for text level
  if (level === "text") {
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
  }
  
  // For basic level, allow some safe HTML tags
  else if (level === "basic") {
    // Remove all HTML except safe tags
    sanitized = sanitized.replace(/<(?!\/?(?:b|i|em|strong|u|br|p)\b)[^>]*>/gi, "")
    
    // Escape remaining unsafe characters
    sanitized = sanitized
      .replace(/&(?!(amp|lt|gt|quot|#x27|#x2F);)/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
  }
  
  // For rich level, allow more HTML tags (future use)
  else if (level === "rich") {
    // Remove all HTML except safe tags
    sanitized = sanitized.replace(/<(?!\/?(?:b|i|em|strong|u|br|p|ul|ol|li|h3|h4)\b)[^>]*>/gi, "")
    
    // Escape remaining unsafe characters
    sanitized = sanitized
      .replace(/&(?!(amp|lt|gt|quot|#x27|#x2F);)/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
  }

  return sanitized
}

/**
 * Sanitize an array of strings
 * @param inputs - Array of strings to sanitize
 * @param level - Sanitization level
 * @returns Array of sanitized strings
 */
export function sanitizeArray(inputs: string[], level: "text" | "basic" | "rich" = "text"): string[] {
  return inputs.map(input => sanitizeInput(input, level)).filter(Boolean)
}

/**
 * Sanitize user profile data
 * @param profile - User profile with potentially unsafe data
 * @returns Sanitized user profile
 */
export function sanitizeUserProfile(profile: any) {
  return {
    ...profile,
    // Sanitize text fields that could contain user input
    preferences: {
      ...profile.preferences,
      dislikedFoods: profile.preferences?.dislikedFoods 
        ? sanitizeArray(profile.preferences.dislikedFoods, "text")
        : [],
      cuisineTypes: profile.preferences?.cuisineTypes
        ? sanitizeArray(profile.preferences.cuisineTypes, "text")
        : [],
    },
    dietaryRestrictions: profile.dietaryRestrictions
      ? sanitizeArray(profile.dietaryRestrictions, "text")
      : [],
    allergies: profile.allergies
      ? sanitizeArray(profile.allergies, "text")
      : [],
  }
}

/**
 * Sanitize chat message content
 * @param content - Chat message content
 * @returns Sanitized message content
 */
export function sanitizeChatMessage(content: string): string {
  return sanitizeInput(content, "basic")
}

/**
 * Validate and sanitize form input with length limits
 * @param input - Form input value
 * @param options - Validation options
 * @returns Object with sanitized value and validation result
 */
export function validateAndSanitizeFormInput(
  input: string,
  options: {
    maxLength?: number
    minLength?: number
    level?: keyof typeof SANITIZATION_CONFIGS
  } = {}
): {
  value: string
  isValid: boolean
  error?: string
} {
  const { maxLength = 500, minLength = 0, level = "text" } = options
  
  // First sanitize
  const sanitized = sanitizeInput(input, level)
  
  // Then validate length
  if (sanitized.length < minLength) {
    return {
      value: sanitized,
      isValid: false,
      error: `Input must be at least ${minLength} characters long`,
    }
  }
  
  if (sanitized.length > maxLength) {
    return {
      value: sanitized.substring(0, maxLength),
      isValid: false,
      error: `Input must be no more than ${maxLength} characters long`,
    }
  }
  
  return {
    value: sanitized,
    isValid: true,
  }
}

/**
 * Sanitize meal description that might come from AI or user input
 * @param description - Meal description
 * @returns Sanitized description
 */
export function sanitizeMealDescription(description: string): string {
  return sanitizeInput(description, "basic")
}

/**
 * Sanitize ingredient list
 * @param ingredients - Array of ingredient strings
 * @returns Sanitized ingredient list
 */
export function sanitizeIngredients(ingredients: string[]): string[] {
  return sanitizeArray(ingredients, "text")
}