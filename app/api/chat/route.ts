import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/db/prisma'
import { generateAIResponse } from '../../../lib/services/ai.service'
import { ChatRequestSchema, ChatResponseSchema } from '../../../types/api.types'
import type { ChatRequest, ChatResponse } from '../../../types/api.types'

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse | { error: string }>> {
  try {
    // 1. Validate input with Zod
    const body = await request.json()
    const validatedData = ChatRequestSchema.parse(body)
    
    const { message, sessionId, mode } = validatedData as ChatRequest

    // 2. Fetch session and validate it exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 3. Save user message
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        sessionId: sessionId,
      },
    })

    // 4. Get all messages for context
    const allMessages = await prisma.message.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: 'asc' },
    })

    // 5. Call AI service
    const aiReply = await generateAIResponse({
      messages: allMessages,
      mode: mode,
    })

    // 6. Save AI response
    await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiReply,
        sessionId: sessionId,
      },
    })

    // 7. Return response
    const response: ChatResponse = { reply: aiReply }
    
    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Chat API error:', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    // Handle other errors
    if (error instanceof Error) {
      // Don't leak internal error details in production
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
