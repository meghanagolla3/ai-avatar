import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { memoryService } from '../../../lib/services/memory.service'
import type { ChatMode } from '../../../types/chat.types'

const MemoryRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  mode: z.enum(['interview', 'tutor']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, mode } = MemoryRequestSchema.parse(body)

    // Get memory statistics
    const stats = await memoryService.getMemoryStats(sessionId)

    return NextResponse.json({
      success: true,
      stats,
    })

  } catch (error) {
    console.error('Memory API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get memory statistics' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = MemoryRequestSchema.parse(body)

    // Clear memory for session
    await memoryService.clearMemory(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Memory cleared successfully',
    })

  } catch (error) {
    console.error('Memory clear API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to clear memory' },
      { status: 500 }
    )
  }
}
