import DOMPurify from "dompurify"

// Configuration for different sanitization levels
const SANITIZATION_CONFIGS = {
  // For user input that will be displayed as text (most restrictive)
  text: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // For basic HTML content (forms, descriptions)
  basic: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br", "p"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // For rich content (if needed in future)
  rich: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br", "p", "ul", "ol", "li", "h3", "h4"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - The user input to sanitize
 * @param level - Sanitization level: 'text', 'basic', or 'rich'
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(input: string, level: keyof typeof SANITIZATION_CONFIGS = "text"): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  // Trim whitespace
  const trimmed = input.trim()
  if (!trimmed) {
    return ""
  }

  // Configure DOMPurify
  const config = SANITIZATION_CONFIGS[level]
  
  // Sanitize the input
  const sanitized = DOMPurify.sanitize(trimmed, config)
  
  return sanitized
}

/**
 * Sanitize an array of strings
 * @param inputs - Array of strings to sanitize
 * @param level - Sanitization level
 * @returns Array of sanitized strings
 */
export function sanitizeArray(inputs: string[], level: keyof typeof SANITIZATION_CONFIGS = "text"): string[] {
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