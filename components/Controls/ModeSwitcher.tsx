'use client'

import { useState } from 'react'
import { useChatStore } from '../../store/useChatStore'
import type { ChatMode } from '../../types/chat.types'

interface ModeSwitcherProps {
  onModeChange?: (mode: ChatMode) => void
  className?: string
}

export function ModeSwitcher({ onModeChange, className = '' }: ModeSwitcherProps) {
  const { mode, setMode, sessionId } = useChatStore()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleModeChange = async (newMode: ChatMode) => {
    if (newMode === mode || isTransitioning) return

    setIsTransitioning(true)

    try {
      // Update local state immediately for responsive UI
      setMode(newMode)
      
      // Notify parent component
      onModeChange?.(newMode)

      // If there's an active session, you might want to update it
      if (sessionId) {
        // Optional: Update session mode in database
        await updateSessionMode(sessionId, newMode)
      }

      // Reset any mode-specific state if needed
      // This could include clearing certain UI states, resetting avatar, etc.
      
    } catch (error) {
      console.error('Mode switch error:', error)
      // Revert on error
      setMode(mode)
    } finally {
      // Allow a brief moment for the transition animation
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const updateSessionMode = async (sessionId: string, newMode: ChatMode) => {
    try {
      const response = await fetch('/api/session/mode', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          mode: newMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update session mode')
      }
    } catch (error) {
      console.error('Session mode update error:', error)
      // Don't throw - mode switching should still work locally
    }
  }

  const getModeIcon = (modeType: ChatMode) => {
    switch (modeType) {
      case 'interview':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case 'tutor':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.69-.845L3.31 9.397zM10 12a2 2 0 100-4 0 2 2 0 000 4z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getModeColor = (modeType: ChatMode) => {
    switch (modeType) {
      case 'interview':
        return mode === modeType
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      case 'tutor':
        return mode === modeType
          ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getModeLabel = (modeType: ChatMode) => {
    switch (modeType) {
      case 'interview':
        return 'Interview Mode'
      case 'tutor':
        return 'Tutor Mode'
      default:
        return 'Unknown Mode'
    }
  }

  const getModeDescription = (modeType: ChatMode) => {
    switch (modeType) {
      case 'interview':
        return 'Technical interview with structured questions'
      case 'tutor':
        return 'Educational tutoring with step-by-step guidance'
      default:
        return ''
    }
  }

  return (
    <div className={`mode-switcher ${className}`}>
      <div className="flex flex-col space-y-2">
        {/* Mode Toggle Buttons */}
        <div className="flex gap-2 p-1 bg-gray-50 rounded-lg">
          <button
            onClick={() => handleModeChange('interview')}
            disabled={isTransitioning}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${getModeColor('interview')} ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            title={getModeDescription('interview')}
          >
            {getModeIcon('interview')}
            <span className="hidden sm:inline">Interview</span>
          </button>
          
          <button
            onClick={() => handleModeChange('tutor')}
            disabled={isTransitioning}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${getModeColor('tutor')} ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            title={getModeDescription('tutor')}
          >
            {getModeIcon('tutor')}
            <span className="hidden sm:inline">Tutor</span>
          </button>
        </div>

        {/* Current Mode Description */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">
            {getModeLabel(mode)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {getModeDescription(mode)}
          </p>
        </div>

        {/* Transition Indicator */}
        {isTransitioning && (
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span>Switching modes...</span>
          </div>
        )}
      </div>
    </div>
  )
}
