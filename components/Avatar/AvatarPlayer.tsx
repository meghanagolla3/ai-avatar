'use client'

import { useState, useEffect, useRef } from 'react'
import { avatarService, type AvatarSession, type AvatarConfig } from '../../lib/services/avatar.service'
import { useChatStore } from '../../store/useChatStore'
import type { ChatMode } from '../../types/chat.types'

interface AvatarPlayerProps {
  onAvatarReady?: () => void
  onAvatarError?: (error: string) => void
  onSpeakingStart?: () => void
  onSpeakingEnd?: () => void
}

export function AvatarPlayer({ 
  onAvatarReady, 
  onAvatarError, 
  onSpeakingStart, 
  onSpeakingEnd 
}: AvatarPlayerProps) {
  const { mode } = useChatStore()
  const [session, setSession] = useState<AvatarSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Mode-specific avatar configurations
  const getAvatarConfig = (currentMode: ChatMode): AvatarConfig => {
    switch (currentMode) {
      case 'interview':
        return {
          avatarId: process.env.LIVEAVATAR_INTERVIEW_AVATAR_ID || 
                   process.env.LIVEAVATAR_AVATAR_ID || 
                   '9650a758-1085-4d49-8bf3-f347565ec229',
          voiceId: process.env.LIVEAVATAR_INTERVIEW_VOICE_ID || 
                  process.env.LIVEAVATAR_VOICE_ID || 
                  'c2527536-6d1f-4412-a643-53a3497dada9',
          language: 'en',
          quality: 'high', // Higher quality for interviews
        }
      case 'tutor':
        return {
          avatarId: process.env.LIVEAVATAR_TUTOR_AVATAR_ID || 
                   process.env.LIVEAVATAR_AVATAR_ID || 
                   '9650a758-1085-4d49-8bf3-f347565ec229',
          voiceId: process.env.LIVEAVATAR_TUTOR_VOICE_ID || 
                  process.env.LIVEAVATAR_VOICE_ID || 
                  'c2527536-6d1f-4412-a643-53a3497dada9',
          language: 'en',
          quality: 'medium', // Medium quality for tutoring
        }
      default:
        return {
          avatarId: process.env.LIVEAVATAR_AVATAR_ID || '9650a758-1085-4d49-8bf3-f347565ec229',
          voiceId: process.env.LIVEAVATAR_VOICE_ID || 'c2527536-6d1f-4412-a643-53a3497dada9',
          language: 'en',
          quality: 'medium',
        }
    }
  }

  const defaultAvatarConfig = getAvatarConfig(mode)

  // Initialize avatar session
  const initializeAvatar = async () => {
    if (avatarService.isSessionActive()) {
      console.log('Avatar session already active, stopping initialization')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Starting avatar initialization...')
      const avatarSession = await avatarService.createAvatarSession(defaultAvatarConfig)
      setSession(avatarSession)
      
      // Start of avatar stream
      await avatarService.startAvatarStream(
        avatarSession.sessionId,
        avatarSession.token
      )
      
      setIsStreaming(true)
      setReconnectAttempts(0)
      onAvatarReady?.()
      
      console.log('Avatar session initialized successfully:', avatarSession.sessionId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Avatar initialization failed'
      setError(errorMessage)
      onAvatarError?.(errorMessage)
      console.error('Avatar initialization error:', err)
      
      // Stop further attempts on error
      setIsLoading(false)
      return
    } finally {
      setIsLoading(false)
    }
  }

  // Make avatar speak with audio
  const speakWithAvatar = async (audioData: ArrayBuffer): Promise<void> => {
    if (!session || !isStreaming) {
      throw new Error('Avatar not ready for speaking')
    }

    setIsSpeaking(true)
    onSpeakingStart?.()

    try {
      await avatarService.speakWithAvatar(audioData)
    } catch (err) {
      console.error('Avatar speaking error:', err)
      throw err
    } finally {
      setIsSpeaking(false)
      onSpeakingEnd?.()
    }
  }

  // Handle avatar reconnection
  const handleReconnect = async () => {
    if (reconnectAttempts >= 3) {
      setError('Maximum reconnection attempts reached')
      return
    }

    setIsLoading(true)
    setReconnectAttempts(prev => prev + 1)

    try {
      const newSession = await avatarService.reconnect()
      if (newSession) {
        setSession(newSession)
        setIsStreaming(true)
        setError(null)
        setReconnectAttempts(0)
        onAvatarReady?.()
      }
    } catch (err) {
      console.error('Avatar reconnection failed:', err)
      
      // Schedule another reconnection attempt
      reconnectTimeoutRef.current = setTimeout(() => {
        handleReconnect()
      }, 5000 * reconnectAttempts) as unknown as NodeJS.Timeout
    } finally {
      setIsLoading(false)
    }
  }

  // Stop avatar session
  const stopAvatar = async () => {
    try {
      await avatarService.stopAvatarStream()
      setSession(null)
      setIsStreaming(false)
      setIsSpeaking(false)
    } catch (err) {
      console.error('Error stopping avatar:', err)
    }
  }

  // Initialize on mount and reinitialize when mode changes
  useEffect(() => {
    initializeAvatar()

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      stopAvatar()
    }
  }, [mode]) // Reinitialize when mode changes

  // Handle connection errors
  useEffect(() => {
    if (error && !isLoading) {
      const shouldReconnect = reconnectAttempts < 3
      if (shouldReconnect) {
        handleReconnect()
      }
    }
  }, [error])

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-xl">
      {/* Avatar Video Container */}
      <div className="relative aspect-video bg-gray-800">
        {/* Mock video placeholder - replace with actual HeyGen video stream */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isLoading && (
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-sm">Initializing Avatar...</p>
            </div>
          )}
          
          {isStreaming && !isLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                {/* Avatar placeholder */}
                <div className="w-32 h-32 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <div className="text-white text-4xl">{'{AI}'}</div>
                </div>
                <p className="text-white text-sm">Avatar Active</p>
                {isSpeaking && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75" />
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {error && !isLoading && (
            <div className="text-center">
              <div className="text-red-400 text-6xl mb-4">{'{!}'}</div>
              <p className="text-red-400 text-sm">{error}</p>
              {reconnectAttempts < 3 && (
                <p className="text-gray-400 text-xs mt-2">
                  Reconnecting... (Attempt {reconnectAttempts + 1}/3)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Hidden video element for actual avatar stream */}
        <video
          ref={videoRef}
          className="hidden"
          autoPlay
          playsInline
          muted
        />
      </div>

      {/* Avatar Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            isStreaming ? 'bg-green-500' : 
            isLoading ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} />
          <span className="text-white text-xs">
            {isStreaming ? 'Live' : 
             isLoading ? 'Connecting...' : 
             'Offline'}
          </span>
        </div>

        {/* Manual controls */}
        <div className="flex gap-2">
          {(!isStreaming && !isLoading) && (
            <button
              onClick={initializeAvatar}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7m0 0l4-4m0 0l4 4m-4-4v7m0 0l4 4m-4-4v7m0 0l4 4" />
              </svg>
              Connect
            </button>
          )}
          
          {isLoading && (
            <button
              disabled
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded opacity-75 cursor-not-allowed flex items-center gap-1"
            >
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16M4 4l16 0M12 4v16m-8-8v16" />
              </svg>
              Connecting...
            </button>
          )}
          
          {isStreaming && (
            <button
              onClick={stopAvatar}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Speaking indicator overlay */}
      {isSpeaking && (
        <div className="absolute top-4 right-4">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Speaking
          </div>
        </div>
      )}
    </div>
  )
}

// Export hook for avatar interaction
export function useAvatarPlayer() {
  const [avatarRef, setAvatarRef] = useState<{ speakWithAvatar: (audioData: ArrayBuffer) => Promise<void> } | null>(null)

  const setAvatarRefCallback = (ref: any) => {
    if (ref) {
      setAvatarRef({
        speakWithAvatar: ref.speakWithAvatar,
      })
    }
  }

  return {
    avatarRef,
    setAvatarRef: setAvatarRefCallback,
  }
}
