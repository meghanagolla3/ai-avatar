// LiveAvatar API Integration
// Based on https://docs.liveavatar.com and https://api.liveavatar.com

export interface AvatarSession {
  sessionId: string
  token: string
  avatarId: string
  voiceId: string
}

export interface AvatarConfig {
  avatarId: string
  voiceId: string
  language: string
  quality: 'low' | 'medium' | 'high'
}

export interface LiveAvatarStream {
  streamUrl: string
  sessionId: string
  token: string
}

export class LiveAvatarService {
  private currentSession: AvatarSession | null = null
  private isInitialized = false
  private streamUrl: string | null = null

  constructor() {
    this.initializeService()
  }

  private async initializeService(): Promise<void> {
    if (this.isInitialized || !process.env.LIVEAVATAR_API_KEY) {
      return
    }

    this.isInitialized = true
    console.log('LiveAvatar service initialized')
  }

  private async makeAPIRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    const maxRetries = 3
    const baseDelay = 1000

    // Debug: Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_LIVEAVATAR_API_KEY || process.env.LIVEAVATAR_API_KEY
    console.log('Avatar Service - API Key available:', !!apiKey)
    console.log('Avatar Service - API Key length:', apiKey?.length || 0)

    if (!apiKey) {
      throw new Error('LiveAvatar API key not found in environment variables')
    }

    while (retryCount <= maxRetries) {
      try {
        const response = await fetch(`https://api.liveavatar.com/v1${endpoint}`, {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Avatar-Platform/1.0',
            ...options.headers,
          },
          ...options,
        })

        if (response.ok) {
          return response
        }

        // Handle specific error codes
        if (response.status === 401) {
          throw new Error('Invalid LiveAvatar API key. Please check your LIVEAVATAR_API_KEY environment variable.')
        }

        if (response.status === 403) {
          throw new Error('Access forbidden. Your API key may not have access to this avatar/voice.')
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, retryCount)
          
          console.log(`Rate limited. Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        if (response.status >= 500) {
          const delay = baseDelay * Math.pow(2, retryCount)
          console.log(`Server error. Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // For other client errors, don't retry
        const errorText = await response.text()
        console.error('LiveAvatar API error details:', errorText)
        throw new Error(`LiveAvatar API error: ${response.status} ${response.statusText} - ${errorText}`)

      } catch (error) {
        console.error(`API request failed (attempt ${retryCount + 1}/${maxRetries}):`, error)
        
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        throw error
      }
    }

    throw new Error(`LiveAvatar API failed after ${maxRetries} attempts`)
  }

  async createAvatarSession(config: AvatarConfig): Promise<AvatarSession> {
    await this.initializeService()

    try {
      // Create session token using LiveAvatar API
      console.log('Avatar Service - Config received:', config)
      
      // Try hardcoded values to test API
      const requestBody = {
        avatar_id: '9650a758-1085-4d49-8bf3-f347565ec229',
        avatar_persona: {
          voice_id: 'c2527536-6d1f-4412-a643-53a3497dada9',
          language: 'en',
          voice_settings: {
            provider: 'elevenLabs',
            speed: 1,
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
            model: 'eleven_flash_v2_5'
          }
        },
        mode: 'FULL', // Correct parameter name for LiveAvatar API
        is_sandbox: false,
        video_settings: {
          quality: 'high',
          encoding: 'H264'
        },
        interactivity_type: 'CONVERSATIONAL'
      }
      
      const jsonBody = JSON.stringify(requestBody)
      console.log('Avatar Service - Request body:', jsonBody)
      console.log('Avatar Service - mode value:', requestBody.mode)
      console.log('Avatar Service - mode type:', typeof requestBody.mode)
      console.log('Avatar Service - JSON body length:', jsonBody.length)
      
      // Try with full URL and explicit headers
      const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.NEXT_PUBLIC_LIVEAVATAR_API_KEY || process.env.LIVEAVATAR_API_KEY!,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Avatar-Platform/1.0',
        },
        body: jsonBody,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LiveAvatar API error:', response.status, errorText)
        throw new Error(`LiveAvatar API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      this.currentSession = {
        sessionId: data.session_id || data.id,
        token: data.session_token || data.token,
        avatarId: config.avatarId,
        voiceId: config.voiceId,
      }

      return this.currentSession
    } catch (error) {
      console.error('Failed to create avatar session:', error)
      throw new Error('Avatar session creation failed')
    }
  }

  async startAvatarStream(sessionId: string, token: string): Promise<string> {
    try {
      // Start session using correct LiveAvatar API endpoint
      const response = await fetch('https://api.liveavatar.com/v1/sessions/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Avatar-Platform/1.0',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LiveAvatar start session error:', response.status, errorText)
        throw new Error(`LiveAvatar start session error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('LiveAvatar session started:', data)
      
      // Extract stream URL from response
      this.streamUrl = data.data?.ws_url || data.data?.livekit_url || data.ws_url || data.url

      if (!this.streamUrl) {
        console.log('No stream URL found, session may be started without streaming')
        return sessionId // Return session ID as fallback
      }

      return this.streamUrl
    } catch (error) {
      console.error('Failed to start avatar stream:', error)
      throw new Error('Avatar stream start failed')
    }
  }

  async speakWithAvatar(audioData: ArrayBuffer): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active avatar session')
    }

    try {
      // Send audio data to avatar for speech
      const response = await this.makeAPIRequest(`/sessions/${this.currentSession?.sessionId}/speak`, {
        method: 'POST',
        body: audioData,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })

      if (!response.ok) {
        throw new Error(`Avatar speech failed: ${response.status}`)
      }

      console.log('Avatar speech completed successfully')
    } catch (error) {
      console.error('Failed to speak with avatar:', error)
      throw new Error('Avatar speech failed')
    }
  }

  async stopAvatarStream(): Promise<void> {
    try {
      if (this.currentSession) {
        // Try DELETE method first (common for stopping sessions)
        try {
          await this.makeAPIRequest(`/sessions/${this.currentSession.sessionId}`, {
            method: 'DELETE',
          })
        } catch (deleteError) {
          // If DELETE fails, try POST stop method
          try {
            await this.makeAPIRequest(`/sessions/${this.currentSession.sessionId}/stop`, {
              method: 'POST',
            })
          } catch (stopError) {
            console.log('Session stop endpoint not available, cleaning up locally')
          }
        }
      }

      // Always clean up local state
      this.currentSession = null
      this.streamUrl = null
      console.log('Avatar session stopped locally')
    } catch (error) {
      console.error('Error stopping avatar:', error)
      // Ensure cleanup even on error
      this.currentSession = null
      this.streamUrl = null
    }
  }

  getCurrentSession(): AvatarSession | null {
    return this.currentSession
  }

  getStreamUrl(): string | null {
    return this.streamUrl
  }

  isSessionActive(): boolean {
    return this.currentSession !== null
  }

  async reconnect(): Promise<AvatarSession | null> {
    if (!this.currentSession) {
      return null
    }

    try {
      // Re-establish session with existing configuration
      const newSession = await this.createAvatarSession({
        avatarId: this.currentSession.avatarId,
        voiceId: this.currentSession.voiceId,
        language: 'en',
        quality: 'medium',
      })

      await this.startAvatarStream(newSession.sessionId, newSession.token)
      return newSession
    } catch (error) {
      console.error('Avatar reconnection failed:', error)
      throw new Error('Avatar reconnection failed')
    }
  }

  destroy(): void {
    this.stopAvatarStream()
    this.isInitialized = false
  }
}

// Singleton instance
export const avatarService = new LiveAvatarService()
