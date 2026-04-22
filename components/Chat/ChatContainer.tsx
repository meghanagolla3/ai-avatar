'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { MessageBubble } from './MessageBubble'
import { InputBox } from './InputBox'
import { VoiceLoop } from './VoiceLoop'
import { AvatarPlayer } from '../Avatar/AvatarPlayer'

export function ChatContainer() {
  const { messages, isLoading, sessionId, mode } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleVoiceInteractionComplete = (transcription: string, aiResponse: string) => {
    // Voice loop API already saves messages to database
    // We just need to refresh the messages or trigger a re-render
    window.location.reload() // Simple refresh for now, could be optimized with real-time updates
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                AI Avatar Platform
              </h1>
              <p className="text-sm text-gray-600">
                {mode === 'interview' ? 'Technical Interview' : 'AI Tutor'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sessionId ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {sessionId ? 'Connected' : 'No Session'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{'{' + '{' + '}' + '}'}</div>
                <h2 className="text-xl font-semibold mb-2">
                  {mode === 'interview' ? 'Ready for your interview?' : 'Ready to learn?'}
                </h2>
                <p className="text-gray-600 max-w-md">
                  {mode === 'interview' 
                    ? 'I\'ll be conducting a technical interview. Start by introducing yourself and I\'ll begin with the first question.'
                    : 'I\'m here to help you learn. Tell me what topic you\'d like to explore and I\'ll guide you step by step.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-none px-4 py-3 max-w-xs lg:max-w-md">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Voice Loop Interface */}
          <div className="border-t bg-white p-6 mt-auto">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Voice Conversation Mode
                </h3>
                <p className="text-sm text-gray-600">
                  Click the microphone to start a complete voice conversation
                </p>
              </div>
              <VoiceLoop onVoiceInteractionComplete={handleVoiceInteractionComplete} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <InputBox />
      </div>

      {/* Avatar Sidebar */}
      <div className="w-80 bg-white border-l p-4 flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Avatar</h3>
          <p className="text-sm text-gray-600">
            Your AI companion with voice and visual interaction
          </p>
        </div>
        
        <div className="flex-1">
          <AvatarPlayer
            onAvatarReady={() => console.log('Avatar ready')}
            onAvatarError={(error) => console.error('Avatar error:', error)}
            onSpeakingStart={() => console.log('Avatar speaking')}
            onSpeakingEnd={() => console.log('Avatar done speaking')}
          />
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Avatar Status</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Online and ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Voice sync active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Lip-sync enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
