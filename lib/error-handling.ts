// Enhanced error handling and logging utilities
import { toast } from "react-hot-toast"

// Error types for better categorization
export enum ErrorType {
  VALIDATION = "VALIDATION",
  RATE_LIMIT = "RATE_LIMIT", 
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  UNKNOWN = "UNKNOWN",
  AI_GENERATION = "AI_GENERATION",
  DATA_PROCESSING = "DATA_PROCESSING",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// Enhanced error class with better context
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly severity: ErrorSeverity
  public readonly code?: string
  public readonly context?: Record<string, any>
  public readonly timestamp: Date
  public readonly userMessage: string

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      code?: string
      context?: Record<string, any>
      userMessage?: string
      cause?: Error
    }
  ) {
    super(message)
    this.name = "AppError"
    this.type = type
    this.severity = severity
    this.code = options?.code
    this.context = options?.context
    this.timestamp = new Date()
    this.userMessage = options?.userMessage || this.getDefaultUserMessage()
    
    if (options?.cause) {
      this.cause = options.cause
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return "Please check your input and try again."
      case ErrorType.RATE_LIMIT:
        return "Too many requests. Please wait a moment and try again."
      case ErrorType.SERVICE_UNAVAILABLE:
        return "Service temporarily unavailable. Please try again later."
      case ErrorType.NETWORK:
        return "Network error. Please check your connection and try again."
      case ErrorType.AUTH:
        return "Authentication error. Please refresh and try again."
      case ErrorType.AI_GENERATION:
        return "Failed to generate content. Please try again."
      case ErrorType.DATA_PROCESSING:
        return "Failed to process data. Please try again."
      default:
        return "Something went wrong. Please try again."
    }
  }

  // Convert to JSON for logging
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      userMessage: this.userMessage,
      stack: this.stack,
    }
  }
}

// Logger interface
interface Logger {
  log(level: string, message: string, context?: Record<string, any>): void
  error(error: Error | AppError, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  info(message: string, context?: Record<string, any>): void
  debug(message: string, context?: Record<string, any>): void
}

// Console logger implementation (can be replaced with more sophisticated logging)
class ConsoleLogger implements Logger {
  private shouldLog(level: string): boolean {
    const logLevel = process.env.NODE_ENV === "development" ? "debug" : "error"
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[level as keyof typeof levels] >= levels[logLevel as keyof typeof levels]
  }

  log(level: string, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      context: context || {},
    }

    console[level as keyof Console](JSON.stringify(logEntry, null, 2))
  }

  error(error: Error | AppError, context?: Record<string, any>): void {
    const errorContext = {
      ...context,
      errorType: error instanceof AppError ? error.type : "UNKNOWN",
      errorSeverity: error instanceof AppError ? error.severity : ErrorSeverity.MEDIUM,
    }

    this.log("error", error.message, {
      ...errorContext,
      stack: error.stack,
      ...(error instanceof AppError ? error.toJSON() : {}),
    })
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log("warn", message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log("info", message, context)
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log("debug", message, context)
  }
}

// Global logger instance
export const logger = new ConsoleLogger()

// Error handler for API routes
export function handleAPIError(error: unknown, context?: Record<string, any>) {
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    // Convert known error patterns to AppError
    if (error.message.includes("quota") || error.message.includes("rate limit")) {
      appError = new AppError(
        error.message,
        ErrorType.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        {
          userMessage: "Service temporarily unavailable due to high demand. Please try again in a few minutes.",
          cause: error,
          context,
        }
      )
    } else if (error.message.includes("network") || error.message.includes("fetch")) {
      appError = new AppError(
        error.message,
        ErrorType.NETWORK,
        ErrorSeverity.HIGH,
        {
          cause: error,
          context,
        }
      )
    } else if (error.message.includes("validation") || error.message.includes("schema")) {
      appError = new AppError(
        error.message,
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        {
          cause: error,
          context,
        }
      )
    } else {
      appError = new AppError(
        error.message,
        ErrorType.UNKNOWN,
        ErrorSeverity.HIGH,
        {
          cause: error,
          context,
        }
      )
    }
  } else {
    appError = new AppError(
      "An unexpected error occurred",
      ErrorType.UNKNOWN,
      ErrorSeverity.HIGH,
      {
        context: { ...context, originalError: error },
      }
    )
  }

  // Log the error
  logger.error(appError, context)

  return appError
}

// Error handler for client-side errors
export function handleClientError(error: unknown, context?: Record<string, any>) {
  const appError = handleAPIError(error, context)
  
  // Show user-friendly toast message
  toast.error(appError.userMessage)
  
  return appError
}

// Async wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw handleAPIError(error, context)
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  private startTime: number

  constructor(private operationName: string) {
    this.startTime = Date.now()
  }

  finish(context?: Record<string, any>) {
    const duration = Date.now() - this.startTime
    
    logger.info(`Performance: ${this.operationName}`, {
      ...context,
      duration: `${duration}ms`,
      operationName: this.operationName,
    })

    // Log slow operations as warnings
    if (duration > 5000) { // 5 seconds
      logger.warn(`Slow operation detected: ${this.operationName}`, {
        ...context,
        duration: `${duration}ms`,
        operationName: this.operationName,
      })
    }

    return duration
  }
}

// Usage helper for performance monitoring
export function monitorPerformance(operationName: string) {
  return new PerformanceMonitor(operationName)
}

// Recovery utilities
export class ErrorRecovery {
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number
      delay?: number
      backoff?: boolean
      context?: Record<string, any>
    } = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = true, context } = options
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts
        
        logger.warn(`Attempt ${attempt}/${maxAttempts} failed`, {
          ...context,
          attempt,
          maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        })

        if (isLastAttempt) {
          throw handleAPIError(error, { ...context, totalAttempts: attempt })
        }

        // Wait before retry with optional exponential backoff
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new AppError("Retry loop completed without success or failure", ErrorType.UNKNOWN, ErrorSeverity.HIGH)
  }
}