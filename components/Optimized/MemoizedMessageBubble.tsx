'use client'

import { memo, useMemo } from 'react'
import type { Message } from '../../types/chat.types'
import { AudioPlayer } from '../Chat/AudioPlayer'

interface MemoizedMessageBubbleProps {
  message: Message
  isLatest?: boolean
  onAudioPlay?: () => void
  onAudioEnd?: () => void
}

// Memoized message bubble to prevent unnecessary re-renders
export const MemoizedMessageBubble = memo<MemoizedMessageBubbleProps>(function MessageBubble({
  message,
  isLatest = false,
  onAudioPlay,
  onAudioEnd,
}) {
  // Memoize message content processing
  const processedContent = useMemo(() => {
    return message.content
      .split('\n')
      .map((line, index) => (
        <span key={index}>
          {line}
          {index < message.content.split('\n').length - 1 && <br />}
        </span>
      ))
  }, [message.content])

  // Memoize timestamp formatting
  const formattedTime = useMemo(() => {
    return new Date(message.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.createdAt])

  // Memoize avatar styling
  const avatarStyle = useMemo(() => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: message.role === 'user' ? '#3B82F6' : '#10B981',
  }), [message.role])

  return (
    <div 
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      data-message-id={message.id}
      data-message-role={message.role}
    >
      <div className={`flex items-end gap-2 max-w-xs lg:max-w-md ${
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      }`}>
        {/* Avatar */}
        <div 
          style={avatarStyle}
          className="flex-shrink-0 flex items-center justify-center text-white text-xs font-medium"
        >
          {message.role === 'user' ? 'U' : 'AI'}
        </div>

        {/* Message Content */}
        <div 
          className={`
            rounded-2xl px-4 py-2 max-w-full
            ${message.role === 'user' 
              ? 'bg-blue-600 text-white rounded-br-none' 
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }
            ${isLatest ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          `}
        >
          {/* Message Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs opacity-75">
              {message.role === 'user' ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-xs opacity-50">•</span>
            <span className="text-xs opacity-50">{formattedTime}</span>
          </div>

          {/* Message Content */}
          <div className="text-sm break-words">
            {processedContent}
          </div>

          {/* Audio Player for AI Messages */}
          {message.role === 'assistant' && message.audioUrl && (
            <div className="mt-2">
              <AudioPlayer
                audioUrl={message.audioUrl}
                onPlay={onAudioPlay}
                onEnd={onAudioEnd}
                compact={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.role === nextProps.message.role &&
    prevProps.isLatest === nextProps.isLatest
  )
})

MemoizedMessageBubble.displayName = 'MemoizedMessageBubble'
