import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/db/prisma'
import { processVoiceLoop, validateAudioForVoiceLoop } from '../../../lib/services/voice-loop.service'
import type { ChatMode } from '../../../types/chat.types'

const VoiceLoopSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  mode: z.enum(['interview', 'tutor']),
})

export async function POST(request: NextRequest) {
  try {
    // Get form data with audio file and session info
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const sessionId = formData.get('sessionId') as string
    const mode = formData.get('mode') as string

    // Validate inputs
    const validatedData = VoiceLoopSchema.parse({ sessionId, mode })

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert File to Blob and validate
    const audioBlob = new Blob([audioFile], { type: audioFile.type })
    validateAudioForVoiceLoop(audioBlob)

    // Fetch session messages for context
    const session = await prisma.session.findUnique({
      where: { id: validatedData.sessionId },
      include: { messages: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Save user message (transcription will be added after processing)
    const tempUserMessage = await prisma.message.create({
      data: {
        role: 'user',
        content: '[Voice message processing...]',
        sessionId: validatedData.sessionId,
      },
    })

    try {
      // Process voice loop
      const result = await processVoiceLoop(
        audioBlob,
        session.messages,
        validatedData.mode as ChatMode
      )

      // Update user message with actual transcription
      await prisma.message.update({
        where: { id: tempUserMessage.id },
        data: { content: result.transcription },
      })

      // Save AI response
      const aiMessage = await prisma.message.create({
        data: {
          role: 'assistant',
          content: result.aiResponse,
          sessionId: validatedData.sessionId,
        },
      })

      // Return audio response and messages
      return new NextResponse(result.audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': result.audioBuffer.byteLength.toString(),
          'X-Transcription': result.transcription,
          'X-AI-Response': result.aiResponse,
          'X-Duration': result.duration.toString(),
          'X-User-Message-ID': tempUserMessage.id,
          'X-AI-Message-ID': aiMessage.id,
          'Cache-Control': 'no-cache',
        },
      })

    } catch (processingError) {
      // Clean up the temp message if processing failed
      await prisma.message.delete({
        where: { id: tempUserMessage.id },
      })
      
      throw processingError
    }

  } catch (error) {
    console.error('Voice loop API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Voice loop processing failed' },
      { status: 500 }
    )
  }
}
