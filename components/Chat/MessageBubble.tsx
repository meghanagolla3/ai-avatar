import type { Message } from '../../types/chat.types'
import { AudioPlayer } from './AudioPlayer'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        <div className="text-sm font-medium mb-1">
          {isUser ? 'You' : 'AI'}
        </div>
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {/* Audio Player for AI Messages */}
        {isAssistant && (
          <AudioPlayer 
            text={message.content} 
            autoPlay={true}
            messageId={message.id}
          />
        )}
        
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}
