import { create } from 'zustand'
import type { Message, ChatMode } from '../types/chat.types'

interface ChatState {
  // State
  messages: Message[]
  isLoading: boolean
  sessionId: string | null
  mode: ChatMode
  error: string | null

  // Actions
  sendMessage: (message: string) => Promise<void>
  setSessionId: (sessionId: string) => void
  setMode: (mode: ChatMode) => void
  clearMessages: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  isLoading: false,
  sessionId: null,
  mode: 'interview',
  error: null,

  // Actions
  sendMessage: async (message: string) => {
    const { sessionId, mode, messages } = get()
    
    if (!sessionId) {
      set({ error: 'No active session' })
      return
    }

    if (!message.trim()) {
      set({ error: 'Message cannot be empty' })
      return
    }

    // Clear any previous errors
    set({ error: null, isLoading: true })

    // Optimistic UI update - add user message immediately
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      sessionId,
      createdAt: new Date(),
    }

    set(state => ({
      messages: [...state.messages, optimisticUserMessage],
    }))

    try {
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          mode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      // Add AI response to messages
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        sessionId,
        createdAt: new Date(),
      }

      set(state => ({
        messages: [...state.messages.slice(0, -1), optimisticUserMessage, aiMessage],
        isLoading: false,
      }))

    } catch (error) {
      // Remove optimistic message and set error
      set(state => ({
        messages: state.messages.slice(0, -1),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }))
    }
  },

  setSessionId: (sessionId: string) => {
    set({ sessionId, messages: [], error: null })
  },

  setMode: (mode: ChatMode) => {
    set({ mode })
  },

  clearMessages: () => {
    set({ messages: [] })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },
}))
