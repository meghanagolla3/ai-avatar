import axios from 'axios'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key is required')
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty')
  }

  try {
    // Use a default voice (you can customize this)
    const voiceId = 'pNInz6obpgDQGcFmaJgB' // Adam voice
    const modelId = 'eleven_monolingual_v1'

    const voiceSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    }

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text: text.trim(),
        model_id: modelId,
        voice_settings: voiceSettings,
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    )

    return response.data
  } catch (error) {
    console.error('ElevenLabs TTS error:', error)
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || error.message
      throw new Error(`TTS failed: ${message}`)
    }
    
    throw new Error('Failed to generate speech')
  }
}

export async function getVoices(): Promise<any[]> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key is required')
  }

  try {
    const response = await axios.get(
      `${ELEVENLABS_API_URL}/voices`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
      }
    )

    return response.data.voices
  } catch (error) {
    console.error('ElevenLabs voices error:', error)
    throw new Error('Failed to fetch voices')
  }
}
