import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  handleAPIError,
  handleClientError,
  withErrorHandling,
  PerformanceMonitor,
  ErrorRecovery,
  logger,
} from '@/lib/error-handling'

// Mock console methods and toast
const consoleMethods = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
  },
}))

Object.assign(console, consoleMethods)

describe('error-handling', () => {
  beforeEach(() => {
    Object.values(consoleMethods).forEach(fn => fn.mockClear())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AppError', () => {
    it('should create basic AppError', () => {
      const error = new AppError('Test error')
      
      expect(error.message).toBe('Test error')
      expect(error.type).toBe(ErrorType.UNKNOWN)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.userMessage).toBe('Something went wrong. Please try again.')
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create AppError with custom properties', () => {
      const error = new AppError(
        'Custom error',
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        {
          code: 'CUSTOM_ERROR',
          context: { field: 'email' },
          userMessage: 'Custom user message',
        }
      )
      
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.severity).toBe(ErrorSeverity.LOW)
      expect(error.code).toBe('CUSTOM_ERROR')
      expect(error.context).toEqual({ field: 'email' })
      expect(error.userMessage).toBe('Custom user message')
    })

    it('should generate appropriate default user messages', () => {
      const rateLimitError = new AppError('Rate limited', ErrorType.RATE_LIMIT)
      expect(rateLimitError.userMessage).toBe('Too many requests. Please wait a moment and try again.')

      const validationError = new AppError('Invalid input', ErrorType.VALIDATION)
      expect(validationError.userMessage).toBe('Please check your input and try again.')

      const networkError = new AppError('Network failed', ErrorType.NETWORK)
      expect(networkError.userMessage).toBe('Network error. Please check your connection and try again.')
    })

    it('should serialize to JSON properly', () => {
      const error = new AppError(
        'Test error',
        ErrorType.VALIDATION,
        ErrorSeverity.HIGH,
        {
          code: 'TEST_ERROR',
          context: { test: true },
        }
      )
      
      const json = error.toJSON()
      
      expect(json.name).toBe('AppError')
      expect(json.message).toBe('Test error')
      expect(json.type).toBe(ErrorType.VALIDATION)
      expect(json.severity).toBe(ErrorSeverity.HIGH)
      expect(json.code).toBe('TEST_ERROR')
      expect(json.context).toEqual({ test: true })
      expect(json.timestamp).toBeTruthy()
    })
  })

  describe('handleAPIError', () => {
    it('should handle AppError instances', () => {
      const originalError = new AppError('Original error', ErrorType.VALIDATION)
      const result = handleAPIError(originalError, { contextField: 'test' })
      
      expect(result).toBe(originalError)
      expect(consoleMethods.error).toHaveBeenCalled()
    })

    it('should convert known Error patterns to AppError', () => {
      const quotaError = new Error('quota exceeded')
      const result = handleAPIError(quotaError)
      
      expect(result).toBeInstanceOf(AppError)
      expect(result.type).toBe(ErrorType.RATE_LIMIT)
      expect(result.userMessage).toContain('Service temporarily unavailable')
    })

    it('should handle network errors', () => {
      const networkError = new Error('fetch failed')
      const result = handleAPIError(networkError)
      
      expect(result.type).toBe(ErrorType.NETWORK)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('should handle validation errors', () => {
      const validationError = new Error('validation failed')
      const result = handleAPIError(validationError)
      
      expect(result.type).toBe(ErrorType.VALIDATION)
      expect(result.severity).toBe(ErrorSeverity.LOW)
    })

    it('should handle unknown errors', () => {
      const unknownError = new Error('Something weird happened')
      const result = handleAPIError(unknownError)
      
      expect(result.type).toBe(ErrorType.UNKNOWN)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('should handle non-Error objects', () => {
      const result = handleAPIError('string error')
      
      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('An unexpected error occurred')
    })
  })

  describe('handleClientError', () => {
    const { toast } = await import('react-hot-toast')
    
    it('should handle client errors and show toast', () => {
      const error = new Error('Client error')
      const result = handleClientError(error)
      
      expect(result).toBeInstanceOf(AppError)
      expect(toast.error).toHaveBeenCalledWith(result.userMessage)
    })
  })

  describe('withErrorHandling', () => {
    it('should wrap successful operations', async () => {
      const successfulOperation = vi.fn().mockResolvedValue('success')
      
      const result = await withErrorHandling(successfulOperation, { context: 'test' })
      
      expect(result).toBe('success')
      expect(successfulOperation).toHaveBeenCalled()
    })

    it('should handle and transform errors', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'))
      
      await expect(withErrorHandling(failingOperation, { context: 'test' }))
        .rejects.toBeInstanceOf(AppError)
    })
  })

  describe('PerformanceMonitor', () => {
    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(1000)
    })

    it('should measure operation duration', () => {
      const monitor = new PerformanceMonitor('test-operation')
      
      vi.spyOn(Date, 'now').mockReturnValue(1500) // 500ms later
      const duration = monitor.finish({ context: 'test' })
      
      expect(duration).toBe(500)
      expect(consoleMethods.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test-operation')
      )
    })

    it('should warn on slow operations', () => {
      const monitor = new PerformanceMonitor('slow-operation')
      
      vi.spyOn(Date, 'now').mockReturnValue(7000) // 6000ms later (slow)
      monitor.finish()
      
      expect(consoleMethods.log).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected: slow-operation')
      )
    })
  })

  describe('ErrorRecovery', () => {
    it('should retry successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await ErrorRecovery.retry(operation, { maxAttempts: 3 })
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry failed operations', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValue('success')
      
      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb()
        return 0 as any
      })
      
      const result = await ErrorRecovery.retry(operation, { 
        maxAttempts: 3, 
        delay: 100 
      })
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'))
      
      vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb()
        return 0 as any
      })
      
      await expect(ErrorRecovery.retry(operation, { maxAttempts: 2 }))
        .rejects.toBeInstanceOf(AppError)
      
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should use exponential backoff', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Fail'))
      const timeouts: number[] = []
      
      vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, delay: number) => {
        timeouts.push(delay)
        cb()
        return 0 as any
      })
      
      await expect(ErrorRecovery.retry(operation, { 
        maxAttempts: 3,
        delay: 100,
        backoff: true 
      })).rejects.toThrow()
      
      expect(timeouts).toEqual([100, 200]) // Exponential backoff: 100, 200
    })
  })

  describe('logger', () => {
    it('should log messages with proper format', () => {
      logger.info('Test message', { context: 'test' })
      
      expect(consoleMethods.info).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      )
    })

    it('should log errors with additional context', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION)
      logger.error(error, { additional: 'context' })
      
      expect(consoleMethods.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      )
    })

    it('should respect log levels in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      logger.debug('Debug message')
      expect(consoleMethods.debug).not.toHaveBeenCalled()
      
      logger.error(new Error('Error message'))
      expect(consoleMethods.error).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })
  })
})