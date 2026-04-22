import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/db/prisma'
import type { ChatMode } from '../../../../types/chat.types'

const UpdateModeSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  mode: z.enum(['interview', 'tutor']),
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, mode } = UpdateModeSchema.parse(body)

    // Update session mode in database
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: { mode },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        mode: updatedSession.mode,
        userId: updatedSession.userId,
        createdAt: updatedSession.createdAt,
      },
    })

  } catch (error) {
    console.error('Session mode update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update session mode' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get session mode
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, mode: true, createdAt: true }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session,
    })

  } catch (error) {
    console.error('Session mode retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session mode' },
      { status: 500 }
    )
  }
}
