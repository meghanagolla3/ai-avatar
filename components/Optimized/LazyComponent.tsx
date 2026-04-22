'use client'

import { Suspense, lazy, ComponentType } from 'react'

interface LazyComponentProps {
  loader: () => Promise<{ default: ComponentType<any> }>
  fallback?: React.ReactNode
  error?: React.ReactNode
  delay?: number
}

// Higher-order component for lazy loading with error handling
export function LazyComponent({
  loader,
  fallback = <DefaultFallback />,
  error = <DefaultError />,
  delay = 200,
}: LazyComponentProps) {
  // Create lazy component with delay for better UX
  const LazyComp = lazy(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(loader())
      }, delay)
    })
  })

  return (
    <Suspense fallback={fallback}>
      <LazyComp error={error} />
    </Suspense>
  )
}

// Default fallback component
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}

// Default error component
function DefaultError() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">Failed to load component</p>
        <p className="text-gray-500 text-sm">Please refresh the page and try again</p>
      </div>
    </div>
  )
}

// Preload specific components
export function preloadComponent(loader: () => Promise<{ default: ComponentType<any> }>) {
  return loader()
}

// Code splitting utilities for different component types
export const LazyAvatarPlayer = lazy(() => 
  import('../Avatar/AvatarPlayer').then(module => ({ default: module.AvatarPlayer }))
)

export const LazyChatContainer = lazy(() => 
  import('../Chat/ChatContainer').then(module => ({ default: module.ChatContainer }))
)

export const LazyVoiceLoop = lazy(() => 
  import('../Chat/VoiceLoop').then(module => ({ default: module.VoiceLoop }))
)

export const LazyModeSwitcher = lazy(() => 
  import('../Controls/ModeSwitcher').then(module => ({ default: module.ModeSwitcher }))
)

// Dynamic import helper for conditional loading
export async function importComponent<T = ComponentType<any>>(
  componentName: string,
  path: string
): Promise<T> {
  try {
    const module = await import(path)
    return module[componentName as keyof typeof module] as T
  } catch (error) {
    console.error(`Failed to import component ${componentName}:`, error)
    throw error
  }
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options.threshold, options.rootMargin])

  return isIntersecting
}
