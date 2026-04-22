import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { errorLoggingService, type ErrorLog } from '../../../../lib/services/error-logging.service'

const ErrorLogSchema = z.object({
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    name: z.string(),
  }),
  errorInfo: z.object({
    componentStack: z.string().optional(),
  }).optional(),
  timestamp: z.string(),
  userAgent: z.string(),
  url: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = ErrorLogSchema.parse(body)
    
    // Create error log entry
    const errorLog: ErrorLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: validatedData.timestamp,
      message: validatedData.error.message,
      stack: validatedData.error.stack,
      name: validatedData.error.name,
      componentStack: validatedData.errorInfo?.componentStack,
      userAgent: validatedData.userAgent,
      url: validatedData.url,
      userId: validatedData.userId,
      sessionId: validatedData.sessionId,
      severity: validatedData.severity || 'medium',
      tags: validatedData.tags || [],
      metadata: validatedData.metadata || {},
    }

    // Add to cache (server-side logging)
    errorLoggingService.addToCache(errorLog)

    return NextResponse.json({
      success: true,
      logged: true,
      id: errorLog.id,
    })

  } catch (error) {
    console.error('Error logging API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid error log format',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to log error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null
    const limit = parseInt(searchParams.get('limit') || '50')

    let errors
    
    if (sessionId) {
      errors = errorLoggingService.getErrorsBySession(sessionId)
    } else if (severity) {
      errors = errorLoggingService.getErrorsBySeverity(severity)
    } else {
      errors = errorLoggingService.getRecentErrors(limit)
    }

    return NextResponse.json({
      success: true,
      errors,
      count: errors.length,
      stats: errorLoggingService.getErrorStats(),
    })

  } catch (error) {
    console.error('Error retrieval API error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve errors' 
      },
      { status: 500 }
    )
  }
}
