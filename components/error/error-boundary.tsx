"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { logger, AppError, ErrorType, ErrorSeverity } from "@/lib/error-handling"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: "page" | "component" | "critical"
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = "component", onError } = this.props
    
    // Create comprehensive error context
    const errorContext = {
      errorId: this.state.errorId,
      level,
      retryCount: this.retryCount,
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      timestamp: new Date().toISOString(),
    }

    // Determine error severity based on level
    const severity = level === "critical" 
      ? ErrorSeverity.CRITICAL 
      : level === "page" 
        ? ErrorSeverity.HIGH 
        : ErrorSeverity.MEDIUM

    // Create AppError for better categorization
    const appError = new AppError(
      error.message,
      ErrorType.UNKNOWN,
      severity,
      {
        code: "REACT_ERROR_BOUNDARY",
        context: errorContext,
        cause: error,
      }
    )

    // Log the error
    logger.error(appError, errorContext)

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo)
      } catch (handlerError) {
        logger.error(handlerError as Error, { 
          context: "Error in custom error handler",
          originalErrorId: this.state.errorId 
        })
      }
    }

    // Update state with error info
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.retryCount++
    
    logger.info("Error boundary retry attempt", {
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    })

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    })
  }

  handleReload = () => {
    logger.info("Error boundary page reload", {
      errorId: this.state.errorId,
      retryCount: this.retryCount,
    })

    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  handleHome = () => {
    logger.info("Error boundary navigate home", {
      errorId: this.state.errorId,
      retryCount: this.retryCount,
    })

    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  reportError = () => {
    const { error, errorInfo, errorId } = this.state
    
    // In a real app, this would send to your error reporting service
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: window.navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert("Error details copied to clipboard!")
    }).catch(() => {
      // Fallback: show in console
      console.log("Error Report:", errorReport)
      alert("Error details logged to console")
    })
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback, level = "component" } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Different UI based on error level
      const canRetry = this.retryCount < this.maxRetries
      const showTechnicalDetails = process.env.NODE_ENV === "development"

      if (level === "critical") {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full border-destructive/50">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">
                  Critical Error
                </CardTitle>
                <p className="text-muted-foreground">
                  The application has encountered a critical error and needs to be restarted.
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Error ID: {errorId}
                </p>
                
                {showTechnicalDetails && error && (
                  <div className="text-left bg-muted p-4 rounded-lg">
                    <p className="text-sm font-mono text-destructive break-all">
                      {error.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <Button onClick={this.handleReload} size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload App
                  </Button>
                  <Button variant="outline" onClick={this.reportError} size="sm">
                    <Bug className="w-4 h-4 mr-2" />
                    Report Error
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      if (level === "page") {
        return (
          <div className="min-h-[50vh] flex items-center justify-center p-4">
            <Card className="max-w-lg w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-xl">
                  Page Error
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  This page encountered an error and couldn't load properly.
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-xs text-muted-foreground">
                  Error ID: {errorId}
                </p>

                {showTechnicalDetails && error && (
                  <div className="text-left bg-muted p-3 rounded text-xs font-mono">
                    {error.message}
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  {canRetry && (
                    <Button onClick={this.handleRetry} size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again ({this.maxRetries - this.retryCount} left)
                    </Button>
                  )}
                  <Button variant="outline" onClick={this.handleHome} size="sm">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Component-level error (default)
      return (
        <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-orange-900">
                Component Error
              </h3>
              <p className="text-sm text-orange-700">
                This component failed to render properly.
              </p>
            </div>
          </div>

          {showTechnicalDetails && error && (
            <div className="mb-3 p-2 bg-orange-100 rounded text-xs font-mono text-orange-800">
              {error.message}
            </div>
          )}

          <div className="flex gap-2">
            {canRetry && (
              <Button 
                onClick={this.handleRetry} 
                size="sm" 
                variant="outline"
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            <Button 
              onClick={() => this.setState({ hasError: false })} 
              size="sm"
              variant="ghost"
              className="text-orange-700 hover:bg-orange-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )
    }

    return children
  }
}

// Convenience wrapper components
export function PageErrorBoundary({ children, onError }: { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void }) {
  return (
    <ErrorBoundary level="page" onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

export function ComponentErrorBoundary({ children, onError }: { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void }) {
  return (
    <ErrorBoundary level="component" onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

export function CriticalErrorBoundary({ children, onError }: { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void }) {
  return (
    <ErrorBoundary level="critical" onError={onError}>
      {children}
    </ErrorBoundary>
  )
}