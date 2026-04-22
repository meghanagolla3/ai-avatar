export interface ErrorLog {
  id?: string
  timestamp: string
  message: string
  stack?: string
  name: string
  componentStack?: string
  userAgent: string
  url: string
  userId?: string
  sessionId?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  metadata?: Record<string, any>
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  action?: string
  component?: string
  route?: string
  additionalData?: Record<string, any>
  tags?: string[]
}

class ErrorLoggingService {
  private static instance: ErrorLoggingService
  private logs: ErrorLog[] = []
  private maxLogs = 1000 // Prevent memory leaks

  private constructor() {}

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService()
    }
    return ErrorLoggingService.instance
  }

  /**
   * Log an error with context
   */
  async logError(error: Error | string, context?: ErrorContext): Promise<void> {
    const errorLog = this.createErrorLog(error, context)
    
    // Add to local cache
    this.addToCache(errorLog)
    
    // Send to server
    await this.sendToServer(errorLog)
  }

  /**
   * Create standardized error log
   */
  private createErrorLog(error: Error | string, context?: ErrorContext): ErrorLog {
    const timestamp = new Date().toISOString()
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'
    const url = typeof window !== 'undefined' ? window.location.href : 'Server'
    
    let errorMessage: string
    let stack: string | undefined
    let name: string

    if (typeof error === 'string') {
      errorMessage = error
      name = 'StringError'
    } else {
      errorMessage = error.message
      stack = error.stack
      name = error.name || 'UnknownError'
    }

    // Determine severity based on error type and context
    const severity = this.determineSeverity(errorMessage, context)

    return {
      timestamp,
      message: errorMessage,
      stack,
      name,
      componentStack: context?.component ? `Component: ${context.component}` : undefined,
      userAgent,
      url,
      userId: context?.userId,
      sessionId: context?.sessionId,
      severity,
      tags: this.generateTags(error, context),
      metadata: {
        action: context?.action,
        component: context?.component,
        route: context?.route,
        ...context?.additionalData,
      },
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(message: string, context?: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    const lowerMessage = message.toLowerCase()
    
    // Critical errors
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('authentication') ||
      lowerMessage.includes('authorization')
    ) {
      return 'critical'
    }

    // High severity
    if (
      lowerMessage.includes('failed') ||
      lowerMessage.includes('error') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('crash')
    ) {
      return 'high'
    }

    // Medium severity
    if (
      lowerMessage.includes('warning') ||
      lowerMessage.includes('deprecated') ||
      lowerMessage.includes('invalid')
    ) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Generate tags for better categorization
   */
  private generateTags(error: Error | string, context?: ErrorContext): string[] {
    const tags: string[] = []
    const message = typeof error === 'string' ? error : error.message
    const lowerMessage = message.toLowerCase()

    // Error type tags
    if (lowerMessage.includes('network')) tags.push('network')
    if (lowerMessage.includes('api')) tags.push('api')
    if (lowerMessage.includes('validation')) tags.push('validation')
    if (lowerMessage.includes('permission')) tags.push('permission')
    if (lowerMessage.includes('timeout')) tags.push('timeout')

    // Context tags
    if (context?.component) tags.push('component')
    if (context?.action) tags.push('action')
    if (context?.route) tags.push('route')

    // Environment tags
    if (typeof window !== 'undefined') {
      tags.push('client')
    } else {
      tags.push('server')
    }

    return tags
  }

  /**
   * Add log to local cache
   */
  addToCache(log: ErrorLog): void {
    this.logs.push(log)
    
    // Prevent memory leaks by limiting cache size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * Send error log to server
   */
  private async sendToServer(log: ErrorLog): Promise<void> {
    try {
      // Only send in production or if explicitly enabled
      if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ERROR_LOGGING) {
        return
      }

      const response = await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      })

      if (!response.ok) {
        console.warn('Failed to send error log to server:', response.statusText)
      }
    } catch (sendError) {
      console.warn('Failed to send error log:', sendError)
    }
  }

  /**
   * Get recent errors from cache
   */
  getRecentErrors(count: number = 50): ErrorLog[] {
    return this.logs.slice(-count)
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ErrorLog[] {
    return this.logs.filter(log => log.severity === severity)
  }

  /**
   * Get errors by session
   */
  getErrorsBySession(sessionId: string): ErrorLog[] {
    return this.logs.filter(log => log.sessionId === sessionId)
  }

  /**
   * Clear error cache
   */
  clearCache(): void {
    this.logs = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    bySeverity: Record<string, number>
    byHour: Record<string, number>
  } {
    const bySeverity: Record<string, number> = {}
    const byHour: Record<string, number> = {}

    this.logs.forEach(log => {
      // Count by severity
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1

      // Count by hour
      const hour = new Date(log.timestamp).getHours()
      byHour[hour.toString()] = (byHour[hour.toString()] || 0) + 1
    })

    return {
      total: this.logs.length,
      bySeverity,
      byHour,
    }
  }
}

// Singleton instance
export const errorLoggingService = ErrorLoggingService.getInstance()

// Convenience functions
export const logError = (error: Error | string, context?: ErrorContext) => {
  return errorLoggingService.logError(error, context)
}

export const getErrorStats = () => {
  return errorLoggingService.getErrorStats()
}

export const getRecentErrors = (count?: number) => {
  return errorLoggingService.getRecentErrors(count)
}
