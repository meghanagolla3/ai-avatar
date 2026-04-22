'use client'

import { useCallback } from 'react'
import { toast } from '../components/UI/Toast'
import { logError, type ErrorContext } from '../lib/services/error-logging.service'

export function useErrorHandler() {
  const handleError = useCallback((
    error: Error | string,
    context?: ErrorContext,
    options?: {
      showToast?: boolean
      toastTitle?: string
      toastMessage?: string
      logToServer?: boolean
    }
  ) => {
    const {
      showToast = true,
      toastTitle,
      toastMessage,
      logToServer = true
    } = options || {}

    // Log error
    if (logToServer) {
      logError(error, context)
    }

    // Show toast notification
    if (showToast) {
      const title = toastTitle || 'Something went wrong'
      const message = toastMessage || (typeof error === 'string' ? error : error.message)
      
      toast.error(title, message, {
        persistent: true,
      })
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', error, context)
    }
  }, [])

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    context?: ErrorContext,
    options?: {
      showToast?: boolean
      toastTitle?: string
      toastMessage?: string
      logToServer?: boolean
    }
  ) => {
    try {
      return await asyncFn()
    } catch (error) {
      handleError(error as Error, context, options)
      throw error // Re-throw to allow caller to handle if needed
    }
  }, [handleError])

  const handleNetworkError = useCallback((
    error: Error | string,
    context?: ErrorContext
  ) => {
    const errorContext: ErrorContext = {
      ...context,
      action: 'network_request',
      tags: ['network', 'api'],
    }

    handleError(error, errorContext, {
      toastTitle: 'Network Error',
      toastMessage: 'Please check your connection and try again.',
    })
  }, [handleError])

  const handleValidationError = useCallback((
    error: Error | string,
    context?: ErrorContext
  ) => {
    const errorContext: ErrorContext = {
      ...context,
      action: 'validation',
      tags: ['validation', 'form'],
    }

    handleError(error, errorContext, {
      toastTitle: 'Validation Error',
      toastMessage: 'Please check your input and try again.',
    })
  }, [handleError])

  const handleAuthError = useCallback((
    error: Error | string,
    context?: ErrorContext
  ) => {
    const errorContext: ErrorContext = {
      ...context,
      action: 'authentication',
      tags: ['auth', 'security'],
    }

    handleError(error, errorContext, {
      toastTitle: 'Authentication Error',
      toastMessage: 'Please log in again to continue.',
    })
  }, [handleError])

  return {
    handleError,
    handleAsyncError,
    handleNetworkError,
    handleValidationError,
    handleAuthError,
  }
}

export function useAsyncError() {
  const { handleError } = useErrorHandler()

  const wrapAsync = useCallback((
    asyncFn: () => Promise<any>,
    context?: ErrorContext
  ) => {
    return async (...args: any[]) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        handleError(error as Error, context)
        throw error
      }
    }
  }, [handleError])

  return { wrapAsync }
}

// Utility function for handling API errors
export function handleApiError(
  response: Response,
  defaultMessage: string = 'API request failed'
): Error {
  if (response.status === 401) {
    return new Error('Authentication required. Please log in again.')
  }
  
  if (response.status === 403) {
    return new Error('You do not have permission to perform this action.')
  }
  
  if (response.status === 404) {
    return new Error('The requested resource was not found.')
  }
  
  if (response.status >= 500) {
    return new Error('Server error. Please try again later.')
  }
  
  if (response.status >= 400) {
    return new Error(`Request failed: ${response.status} ${response.statusText}`)
  }
  
  return new Error(defaultMessage)
}
