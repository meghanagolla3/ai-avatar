import { transcribeAudioBlob } from './speech.service'
import { generateAIResponse } from './ai.service'
import { generateSpeech } from '../clients/elevenlabs.client'
import type { Message, ChatMode } from '../../types/chat.types'

export interface VoiceLoopResult {
  transcription: string
  aiResponse: string
  audioBuffer: ArrayBuffer
  duration: number
}

export async function processVoiceLoop(
  audioBlob: Blob,
  messages: Message[],
  mode: ChatMode
): Promise<VoiceLoopResult> {
  const startTime = Date.now()

  try {
    // Step 1: Transcribe audio to text
    const transcription = await transcribeAudioBlob(audioBlob)
    
    // Step 2: Generate AI response
    const aiResponse = await generateAIResponse({
      messages,
      mode,
    })
    
    // Step 3: Generate speech from AI response
    const audioBuffer = await generateSpeech(aiResponse)
    
    const duration = Date.now() - startTime
    
    return {
      transcription,
      aiResponse,
      audioBuffer,
      duration,
    }
    
  } catch (error) {
    console.error('Voice loop error:', error)
    
    if (error instanceof Error) {
      throw new Error(`Voice loop failed: ${error.message}`)
    }
    
    throw new Error('Voice loop processing failed')
  }
}

export function validateAudioForVoiceLoop(audioBlob: Blob): void {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('No audio data provided')
  }

  // Check minimum duration (1 second) and maximum (30 seconds)
  const minSize = 16000 // Rough estimate for 1 second at 16kbps
  const maxSize = 480000 // Rough estimate for 30 seconds at 16kbps
  
  if (audioBlob.size < minSize) {
    throw new Error('Audio too short - minimum 1 second required')
  }
  
  if (audioBlob.size > maxSize) {
    throw new Error('Audio too long - maximum 30 seconds allowed')
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
}
