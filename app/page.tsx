'use client'

import { useState, useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import { ChatContainer } from '../components/Chat/ChatContainer'
import { ModeSwitcher } from '../components/Controls/ModeSwitcher'

export default function Home() {
  const { sessionId, mode, setMode, setSessionId } = useChatStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initSession = async () => {
      try {
        // Create a new session
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'demo-user', // In production, this would come from auth
            mode: 'interview',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.session.id)
          
          // Load persisted mode if available
          await loadPersistedMode(data.session.id)
        }
      } catch (error) {
        console.error('Failed to initialize session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initSession()
  }, [])

  const loadPersistedMode = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/session/mode?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.session.mode) {
          setMode(data.session.mode as 'interview' | 'tutor')
        }
      }
    } catch (error) {
      console.error('Failed to load persisted mode:', error)
    }
  }

  const handleModeChange = async (newMode: 'interview' | 'tutor') => {
    // Mode switching is handled by the ModeSwitcher component
    console.log('Mode changed to:', newMode)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing AI Avatar Platform...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <ModeSwitcher onModeChange={handleModeChange} />
        </div>
      </div>
      <ChatContainer />
    </div>
  )
}
