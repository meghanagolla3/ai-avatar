'use client'

import { useState, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void
  disabled?: boolean
}

export function VoiceRecorder({ onTranscriptionComplete, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })

      // Create MediaRecorder with optimal settings
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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Process the audio
        setIsProcessing(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Transcription failed')
          }

          const data = await response.json()
          
          if (data.transcription && data.transcription.trim()) {
            onTranscriptionComplete(data.transcription.trim())
          } else {
            throw new Error('No speech detected')
          }
        } catch (error) {
          console.error('Transcription error:', error)
          // You could show a toast notification here
        } finally {
          setIsProcessing(false)
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

    } catch (error) {
      console.error('Recording error:', error)
      setIsRecording(false)
    }
  }, [onTranscriptionComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const handleClick = () => {
    if (disabled || isProcessing) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`p-3 rounded-full transition-all duration-200 ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : disabled || isProcessing
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
      title={isRecording ? 'Stop recording' : 'Start voice recording'}
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : isRecording ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <rect x="6" y="6" width="8" height="8" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}
