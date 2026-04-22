import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY,
})

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Create a File object from the Blob
    const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optional: specify language
      response_format: 'json',
    })

    return transcription.text.trim()
  } catch (error) {
    console.error('Whisper transcription error:', error)
    
    if (error instanceof Error) {
      throw new Error(`Transcription failed: ${error.message}`)
    }
    
    throw new Error('Failed to transcribe audio')
  }
}
