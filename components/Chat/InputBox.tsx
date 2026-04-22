'use client'

import { useState } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { VoiceRecorder } from './VoiceRecorder'

export function InputBox() {
  const [input, setInput] = useState('')
  const { sendMessage, isLoading, error, sessionId } = useChatStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading || !sessionId) return

    const messageToSend = input.trim()
    setInput('')
    
    try {
      await sendMessage(messageToSend)
    } catch (error) {
      // Error is handled in the store
      console.error('Send message error:', error)
    }
  }

  const handleVoiceTranscription = (transcription: string) => {
    setInput(transcription)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="border-t bg-white p-4">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={sessionId ? "Type your message or use voice..." : "Please start a session first..."}
          disabled={isLoading || !sessionId}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={1}
        />
        
        <div className="flex gap-2">
          <VoiceRecorder 
            onTranscriptionComplete={handleVoiceTranscription}
            disabled={isLoading || !sessionId}
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !sessionId}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
