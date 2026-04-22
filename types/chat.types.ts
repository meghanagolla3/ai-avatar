export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  sessionId: string
  createdAt: Date
  audioUrl?: string
}

export type ChatMode = 'interview' | 'tutor'

export interface Session {
  id: string
  userId: string
  mode: ChatMode
  createdAt: Date
  messages: Message[]
}

export interface User {
  id: string
  email: string
  createdAt: Date
  sessions: Session[]
}

export interface GenerateAIResponseParams {
  messages: Message[]
  mode: ChatMode
}
