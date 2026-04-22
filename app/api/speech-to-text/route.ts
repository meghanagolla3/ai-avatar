import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudioBlob } from '../../../lib/services/speech.service'

export async function POST(request: NextRequest) {
  try {
    // Get form data with audio file
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert File to Blob
    const audioBlob = new Blob([audioFile], { type: audioFile.type })

    // Transcribe audio
    const transcription = await transcribeAudioBlob(audioBlob)

    return NextResponse.json({
      transcription: transcription,
      success: true,
    })

  } catch (error) {
    console.error('Speech-to-text API error:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
