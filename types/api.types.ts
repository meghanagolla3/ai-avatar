import { z } from 'zod'

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  sessionId: z.string().uuid('Invalid session ID'),
  mode: z.enum(['interview', 'tutor']),
})

export const ChatResponseSchema = z.object({
  reply: z.string(),
})

export interface ChatRequest {
  message: string
  sessionId: string
  mode: 'interview' | 'tutor'
}

export interface ChatResponse {
  reply: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
}
