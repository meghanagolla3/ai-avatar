import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/db/prisma'
import type { ChatMode } from '../../../types/chat.types'

const CreateSessionSchema = z.object({
  mode: z.enum(['interview', 'tutor']),
  userId: z.string().uuid().optional().default('demo-user'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, userId } = CreateSessionSchema.parse(body)

    // For demo purposes, create or get a user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `demo-${userId}@example.com`,
        },
      })
    }

    // Create new session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        mode: mode as ChatMode,
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      mode: session.mode,
      createdAt: session.createdAt,
    })

  } catch (error) {
    console.error('Session creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
