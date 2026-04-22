'use client'

import { useState, useRef, useEffect } from 'react'

interface AudioPlayerProps {
  text: string
  autoPlay?: boolean
  messageId: string
}

export function AudioPlayer({ text, autoPlay = false, messageId }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Generate audio URL when text changes
  const generateAudio = async () => {
    if (!text || text.trim().length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)

      // Auto-play if requested
      if (autoPlay && audioRef.current) {
        audioRef.current.play().catch(console.error)
      }

    } catch (err) {
      console.error('Audio generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate audio')
    } finally {
      setIsLoading(false)
    }
  }

  // Clean up audio URL when component unmounts or text changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Generate audio when text changes
  useEffect(() => {
    generateAudio()
  }, [text, messageId])

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(console.error)
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => setIsPlaying(false)

  if (!text || text.trim().length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          preload="none"
        />
      )}

      <button
        onClick={togglePlay}
        disabled={isLoading || !!error}
        className={`p-2 rounded-full transition-all duration-200 ${
          isLoading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : error
            ? 'bg-red-100 text-red-500 hover:bg-red-200'
            : isPlaying
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={error || (isPlaying ? 'Pause' : 'Play')}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : error ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {error && (
        <span className="text-xs text-red-600" title={error}>
          Audio failed
        </span>
      )}
    </div>
  )
}
