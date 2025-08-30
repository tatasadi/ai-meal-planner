import { describe, it, expect } from 'vitest'
import {
  sanitizeInput,
  sanitizeArray,
  sanitizeUserProfile,
  sanitizeChatMessage,
  validateAndSanitizeFormInput,
  sanitizeMealDescription,
  sanitizeIngredients,
} from '@/lib/sanitization'

describe('sanitization', () => {

  describe('sanitizeInput', () => {
    it('should sanitize basic text input', () => {
      const input = 'Hello World'
      const result = sanitizeInput(input)
      
      expect(result).toBe('Hello World')
    })

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('')
      expect(sanitizeInput('   ')).toBe('')
    })

    it('should handle null/undefined inputs', () => {
      expect(sanitizeInput(null as any)).toBe('')
      expect(sanitizeInput(undefined as any)).toBe('')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = sanitizeInput(input)
      
      expect(result).toBe('Hello World')
    })

    it('should escape HTML for text level', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeInput(input, 'text')
      
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Hello')
    })

    it('should allow safe HTML for basic level', () => {
      const input = '<b>Bold</b> <script>alert("xss")</script> text'
      const result = sanitizeInput(input, 'basic')
      
      expect(result).toBe('<b>Bold</b>  text')
    })
  })

  describe('sanitizeArray', () => {
    it('should sanitize array of strings', () => {
      const inputs = ['Hello', 'World', '<script>alert("xss")</script>']
      const result = sanitizeArray(inputs)
      
      expect(result).toEqual(['Hello', 'World', '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'])
    })

    it('should filter out empty results', () => {
      const inputs = ['Hello', '', '   ', 'World']
      const result = sanitizeArray(inputs)
      
      expect(result).toEqual(['Hello', 'World'])
    })

    it('should handle empty arrays', () => {
      expect(sanitizeArray([])).toEqual([])
    })
  })

  describe('sanitizeUserProfile', () => {
    it('should sanitize user profile fields', () => {
      const profile = {
        id: 'user1',
        preferences: {
          dislikedFoods: ['<script>evil</script>', 'spinach'],
          cuisineTypes: ['italian<script>', 'mexican'],
          other: 'field'
        },
        dietaryRestrictions: ['vegetarian', '<b>gluten-free</b>'],
        allergies: ['nuts<script>', 'shellfish'],
        otherField: 'unchanged'
      }

      const result = sanitizeUserProfile(profile)

      expect(result.preferences.dislikedFoods).toEqual(['&lt;script&gt;evil&lt;&#x2F;script&gt;', 'spinach'])
      expect(result.preferences.cuisineTypes).toEqual(['italian&lt;script&gt;', 'mexican'])
      expect(result.dietaryRestrictions).toEqual(['vegetarian', '&lt;b&gt;gluten-free&lt;&#x2F;b&gt;'])
      expect(result.allergies).toEqual(['nuts&lt;script&gt;', 'shellfish'])
      expect(result.otherField).toBe('unchanged')
      expect(result.preferences.other).toBe('field')
    })

    it('should handle missing preference fields', () => {
      const profile = {
        id: 'user1',
        preferences: {},
        otherField: 'test'
      }

      const result = sanitizeUserProfile(profile)

      expect(result.preferences.dislikedFoods).toEqual([])
      expect(result.preferences.cuisineTypes).toEqual([])
      expect(result.dietaryRestrictions).toEqual([])
      expect(result.allergies).toEqual([])
    })
  })

  describe('sanitizeChatMessage', () => {
    it('should sanitize chat messages with basic HTML allowed', () => {
      const message = '<b>Hello</b> <script>alert("xss")</script> World'
      const result = sanitizeChatMessage(message)
      
      expect(result).toBe('<b>Hello</b>  World')
    })
  })

  describe('validateAndSanitizeFormInput', () => {
    it('should validate and sanitize form input', () => {
      const input = 'Hello World'
      const result = validateAndSanitizeFormInput(input)
      
      expect(result.isValid).toBe(true)
      expect(result.value).toBe('Hello World')
      expect(result.error).toBeUndefined()
    })

    it('should enforce minimum length', () => {
      const input = 'Hi'
      const result = validateAndSanitizeFormInput(input, { minLength: 5 })
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Input must be at least 5 characters long')
    })

    it('should enforce maximum length', () => {
      const input = 'A very long string that exceeds the limit'
      const result = validateAndSanitizeFormInput(input, { maxLength: 10 })
      
      expect(result.isValid).toBe(false)
      expect(result.value).toBe('A very lon')
      expect(result.error).toBe('Input must be no more than 10 characters long')
    })

    it('should sanitize before validation', () => {
      const input = '<script>alert("xss")</script>Hello World'
      const result = validateAndSanitizeFormInput(input)
      
      expect(result.value).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Hello World')
    })
  })

  describe('sanitizeMealDescription', () => {
    it('should sanitize meal descriptions with basic HTML', () => {
      const description = '<p>Delicious <b>pasta</b></p><script>alert("xss")</script>'
      const result = sanitizeMealDescription(description)
      
      expect(result).toBe('<p>Delicious <b>pasta</b></p>')
    })
  })

  describe('sanitizeIngredients', () => {
    it('should sanitize ingredient lists', () => {
      const ingredients = ['2 cups flour', '<script>evil</script> salt', '1 egg']
      const result = sanitizeIngredients(ingredients)
      
      expect(result).toEqual(['2 cups flour', '&lt;script&gt;evil&lt;&#x2F;script&gt; salt', '1 egg'])
    })
  })
})