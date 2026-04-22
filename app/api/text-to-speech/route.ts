import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateSpeech } from '../../../lib/clients/elevenlabs.client'

const TextToSpeechSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(5000, 'Text too long'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = TextToSpeechSchema.parse(body)

    // Generate speech audio
    const audioBuffer = await generateSpeech(text)

    // Return audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Text-to-speech API error:', error)

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
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
