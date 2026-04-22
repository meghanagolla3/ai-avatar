import { transcribeAudio } from '../clients/whisper.client'

export async function transcribeAudioBlob(audioBlob: Blob): Promise<string> {
  // Validate audio blob
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('No audio data provided')
  }

  // Check file size (Whisper has a 25MB limit)
  const maxSize = 25 * 1024 * 1024 // 25MB in bytes
  if (audioBlob.size > maxSize) {
    throw new Error('Audio file too large. Maximum size is 25MB')
  }

  // Validate audio type
  const validTypes = [
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ]
  
  if (!validTypes.includes(audioBlob.type)) {
    throw new Error(`Unsupported audio format: ${audioBlob.type}`)
  }

  try {
    const transcription = await transcribeAudio(audioBlob)
    
    if (!transcription || transcription.trim().length === 0) {
      throw new Error('No speech detected in audio')
    }

    return transcription.trim()
  } catch (error) {
    console.error('Speech service error:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error('Failed to transcribe audio')
  }
}
