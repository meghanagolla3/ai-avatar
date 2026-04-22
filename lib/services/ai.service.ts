import { openai } from '../clients/openai.client'
import { memoryService } from './memory.service'
import type { Message, ChatMode, GenerateAIResponseParams } from '../../types/chat.types'

export function generateSystemPrompt(mode: ChatMode): string {
  if (mode === 'interview') {
    return `You are a professional AI interviewer conducting a technical interview. 

Your role:
- Ask ONE question at a time
- Evaluate the candidate's previous answer before moving to the next question
- Maintain appropriate difficulty progression
- Be strict, concise, and professional
- Focus on technical skills relevant to the position
- Provide brief feedback on answers when appropriate

Guidelines:
- Start with a general introduction and then ask your first question
- Wait for the candidate's response before asking the next question
- Keep questions focused and specific
- Maintain a professional but approachable tone`
  }

  if (mode === 'tutor') {
    return `You are a friendly and patient AI tutor helping students learn various subjects.

Your role:
- Explain concepts step-by-step
- Ask follow-up questions to check understanding
- Adjust explanations based on the student's level
- Be encouraging and supportive
- Provide examples and analogies when helpful

Guidelines:
- Start by introducing yourself and asking what topic they'd like to learn
- Break down complex topics into manageable parts
- Ask questions to gauge understanding before proceeding
- Be patient and adapt to different learning styles
- Celebrate progress and provide positive reinforcement`
  }

  throw new Error(`Invalid mode: ${mode}`)
}

export async function generateAIResponse(params: GenerateAIResponseParams): Promise<string> {
  const { messages, mode } = params

  try {
    // Extract sessionId from messages
    const sessionId = messages[0]?.sessionId || ''
    
    // Use memory service to get optimized context
    const optimizedContext = await memoryService.optimizeContext(sessionId, mode)
    
    // Build system prompt with summary if available
    let systemPrompt = generateSystemPrompt(mode)
    if (optimizedContext.summary) {
      systemPrompt += `\n\nPrevious conversation summary: ${optimizedContext.summary}`
    }
    
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...optimizedContext.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: formattedMessages,
      temperature: mode === 'interview' ? 0.7 : 0.8,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response generated from OpenAI')
    }

    return response.trim()
  } catch (error) {
    console.error('Error generating AI response:', error)
    
    if (error instanceof Error) {
      throw new Error(`AI service error: ${error.message}`)
    }
    
    throw new Error('Failed to generate AI response')
  }
}
