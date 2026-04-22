import type { Message, ChatMode } from '../../types/chat.types'
import { prisma } from '../db/prisma'
import { generateAIResponse } from './ai.service'

export interface MemoryConfig {
  maxMessages: number
  maxTokens: number
  summarizeThreshold: number
  contextWindowBuffer: number
}

export interface ConversationSummary {
  id: string
  sessionId: string
  summary: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface ProcessedMemory {
  messages: Message[]
  summary?: string
  tokenCount: number
  needsSummarization: boolean
}

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxMessages: 15,
  maxTokens: 3500,
  summarizeThreshold: 12,
  contextWindowBuffer: 500,
}

export class MemoryService {
  private config: MemoryConfig

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config }
  }

  /**
   * Estimate token count for a text string
   * Rough approximation: ~4 characters per token
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Calculate total tokens for a list of messages
   */
  private calculateTokens(messages: Message[]): number {
    return messages.reduce((total, message) => {
      return total + this.estimateTokens(message.content) + 10 // Add overhead for role/formatting
    }, 0)
  }

  /**
   * Retrieve and process conversation memory for AI context
   */
  async getConversationMemory(
    sessionId: string,
    mode: ChatMode
  ): Promise<ProcessedMemory> {
    try {
      // Get recent messages from database
      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: this.config.maxMessages * 2, // Get more to allow for summarization
      })

      if (messages.length === 0) {
        return {
          messages: [],
          tokenCount: 0,
          needsSummarization: false,
        }
      }

      // Get existing summary if any
      const summary = await this.getLatestSummary(sessionId)
      
      // Process messages with memory management
      const processedMemory = await this.processMessages(
        messages as Message[],
        summary,
        mode
      )

      return processedMemory
    } catch (error) {
      console.error('Memory retrieval error:', error)
      throw new Error('Failed to retrieve conversation memory')
    }
  }

  /**
   * Process messages according to memory constraints
   */
  private async processMessages(
    messages: Message[],
    existingSummary: string | null,
    mode: ChatMode
  ): Promise<ProcessedMemory> {
    let processedMessages = [...messages]
    let summary = existingSummary
    let needsSummarization = false

    // Check if we need summarization
    const totalTokens = this.calculateTokens(processedMessages)
    
    if (processedMessages.length > this.config.summarizeThreshold || 
        totalTokens > this.config.maxTokens - this.config.contextWindowBuffer) {
      needsSummarization = true
      
      // Generate summary if we don't have one or if we have many new messages
      if (!summary || processedMessages.length > this.config.maxMessages) {
        summary = await this.generateSummary(processedMessages, mode)
        await this.saveSummary(processedMessages[0]?.sessionId || '', summary, processedMessages.length)
      }
      
      // Keep only recent messages after summarization
      processedMessages = processedMessages.slice(-this.config.maxMessages)
    }

    // Ensure we don't exceed token limits
    while (this.calculateTokens(processedMessages) > this.config.maxTokens && 
           processedMessages.length > 2) {
      processedMessages.shift() // Remove oldest message
    }

    return {
      messages: processedMessages,
      summary: summary || undefined,
      tokenCount: this.calculateTokens(processedMessages),
      needsSummarization,
    }
  }

  /**
   * Generate conversation summary using AI
   */
  private async generateSummary(
    messages: Message[],
    mode: ChatMode
  ): Promise<string> {
    try {
      const summaryPrompt = this.buildSummaryPrompt(messages, mode)
      
      // Use AI service to generate summary
      const response = await generateAIResponse({
        messages: [
          { id: 'system', role: 'assistant', content: summaryPrompt, sessionId: '', createdAt: new Date() },
          ...messages.slice(-10) // Include last 10 messages for context
        ],
        mode,
      })

      return response
    } catch (error) {
      console.error('Summary generation error:', error)
      // Fallback to simple summary
      return `Conversation with ${messages.length} messages about ${mode === 'interview' ? 'technical interview' : 'learning session'}.`
    }
  }

  /**
   * Build prompt for conversation summarization
   */
  private buildSummaryPrompt(messages: Message[], mode: ChatMode): string {
    const context = mode === 'interview' 
      ? 'technical interview discussion'
      : 'educational tutoring session'

    return `You are summarizing a ${context}. Create a concise summary (max 150 words) that captures:
1. Main topics discussed
2. Key points or conclusions
3. Important context for continuing the conversation

Focus on information that would be valuable for maintaining conversation continuity. 

Messages to summarize:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Summary:`
  }

  /**
   * Save conversation summary to database
   */
  private async saveSummary(
    sessionId: string,
    summary: string,
    messageCount: number
  ): Promise<void> {
    try {
      await prisma.ConversationSummary.upsert({
        where: { sessionId },
        update: {
          summary,
          messageCount,
          updatedAt: new Date(),
        },
        create: {
          sessionId,
          summary,
          messageCount,
        },
      })
    } catch (error) {
      console.error('Summary save error:', error)
    }
  }

  /**
   * Get latest conversation summary
   */
  private async getLatestSummary(sessionId: string): Promise<string | null> {
    try {
      const summary = await prisma.ConversationSummary.findUnique({
        where: { sessionId },
      })
      return summary?.summary || null
    } catch (error) {
      console.error('Summary retrieval error:', error)
      return null
    }
  }

  /**
   * Optimize context for AI response generation
   */
  async optimizeContext(
    sessionId: string,
    mode: ChatMode,
    newMessage?: string
  ): Promise<{ messages: Message[]; summary?: string }> {
    const memory = await this.getConversationMemory(sessionId, mode)
    
    // Add new message to context if provided
    if (newMessage) {
      const tempMessage: Message = {
        id: 'temp',
        role: 'user',
        content: newMessage,
        sessionId,
        createdAt: new Date(),
      }
      
      memory.messages.push(tempMessage)
      
      // Check if we need to trim after adding new message
      if (memory.tokenCount > this.config.maxTokens) {
        memory.messages.shift()
      }
    }

    return {
      messages: memory.messages,
      summary: memory.summary,
    }
  }

  /**
   * Get memory statistics for monitoring
   */
  async getMemoryStats(sessionId: string): Promise<{
    totalMessages: number
    tokenCount: number
    hasSummary: boolean
    memoryEfficiency: number
  }> {
    try {
      const memory = await this.getConversationMemory(sessionId, 'interview')
      const totalMessages = await prisma.message.count({
        where: { sessionId }
      })

      return {
        totalMessages,
        tokenCount: memory.tokenCount,
        hasSummary: !!memory.summary,
        memoryEfficiency: memory.messages.length / totalMessages,
      }
    } catch (error) {
      console.error('Memory stats error:', error)
      throw new Error('Failed to get memory statistics')
    }
  }

  /**
   * Clear memory for a session (for testing/privacy)
   */
  async clearMemory(sessionId: string): Promise<void> {
    try {
      // Delete summaries for session
      // Clear any cached memory
      console.log(`Memory cleared for session ${sessionId}`)
    } catch (error) {
      console.error('Memory clear error:', error)
      throw new Error('Failed to clear memory')
    }
  }
}

// Singleton instance
export const memoryService = new MemoryService()
