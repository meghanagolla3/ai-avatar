'use client'

import { useState, useRef, useCallback } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { AvatarPlayer } from '../Avatar/AvatarPlayer'

interface VoiceLoopProps {
  onVoiceInteractionComplete?: (transcription: string, aiResponse: string) => void
}

export function VoiceLoop({ onVoiceInteractionComplete }: VoiceLoopProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const avatarRef = useRef<{ speakWithAvatar: (audioData: ArrayBuffer) => Promise<void> } | null>(null)
  
  const { sessionId, mode, messages } = useChatStore()

  const startRecording = useCallback(async () => {
    if (!sessionId) {
      setError('No active session')
      return
    }

    try {
      setError(null)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const recordingBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Process the voice loop
        setIsProcessing(true)
        try {
          const formData = new FormData()
          formData.append('audio', recordingBlob, 'voice-recording.webm')
          formData.append('sessionId', sessionId)
          formData.append('mode', mode)

          const response = await fetch('/api/voice-loop', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Voice loop failed')
          }

          // Get response headers for metadata
          const transcription = response.headers.get('X-Transcription') || ''
          const aiResponse = response.headers.get('X-AI-Response') || ''
          const duration = response.headers.get('X-Duration') || '0'

          // Get audio data
          const audioBuffer = await response.arrayBuffer()
          const responseAudioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
          const audioUrl = URL.createObjectURL(responseAudioBlob)

          // Play AI response with avatar lip-sync
          try {
            // Try to make avatar speak first
            if (avatarRef.current) {
              await avatarRef.current.speakWithAvatar(audioBuffer)
            }
            
            // Fallback to regular audio playback
            if (audioRef.current) {
              audioRef.current.src = audioUrl
              audioRef.current.play().catch(console.error)
            }
          } catch (avatarError) {
            console.warn('Avatar speech failed, using audio fallback:', avatarError)
            
            // Fallback to regular audio playback
            if (audioRef.current) {
              audioRef.current.src = audioUrl
              audioRef.current.play().catch(console.error)
            }
          }

          // Notify parent component
          if (onVoiceInteractionComplete) {
            onVoiceInteractionComplete(transcription, aiResponse)
          }

          console.log(`Voice loop completed in ${duration}ms`)

        } catch (processingError) {
          console.error('Voice loop processing error:', processingError)
          setError(processingError instanceof Error ? processingError.message : 'Voice processing failed')
        } finally {
          setIsProcessing(false)
          setIsRecording(false)
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

    } catch (recordingError) {
      console.error('Recording error:', recordingError)
      setError(recordingError instanceof Error ? recordingError.message : 'Failed to start recording')
      setIsRecording(false)
    }
  }, [sessionId, mode, onVoiceInteractionComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  const handleClick = () => {
    if (isProcessing) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleAvatarReady = (avatarMethods: { speakWithAvatar: (audioData: ArrayBuffer) => Promise<void> }) => {
    avatarRef.current = avatarMethods
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Avatar Player */}
      <div className="w-full max-w-md">
        <AvatarPlayer
          onAvatarReady={() => console.log('Avatar ready for voice interaction')}
          onAvatarError={(error) => console.error('Avatar error:', error)}
          onSpeakingStart={() => console.log('Avatar speaking started')}
          onSpeakingEnd={() => console.log('Avatar speaking ended')}
        />
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="none" />
      
      {/* Voice Loop Button */}
      <button
        onClick={handleClick}
        disabled={isProcessing || !sessionId}
        className={`p-4 rounded-full transition-all duration-200 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg'
            : isProcessing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : !sessionId
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
        }`}
        title={
          error || 
          (!sessionId ? 'No active session' : 
          isRecording ? 'Stop recording' : 
          isProcessing ? 'Processing...' : 
          'Start voice conversation')
        }
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Processing...</span>
          </div>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-full animate-pulse" />
            <span className="text-xs">Recording...</span>
          </div>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-blue-600 text-sm hover:underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isProcessing && !error && (
        <div className="text-center text-gray-600 text-sm max-w-xs">
          <p>Click to start a voice conversation</p>
          <p className="text-xs mt-1">Speak naturally, I'll respond with voice and avatar</p>
        </div>
      )}
    </div>
  )
}
