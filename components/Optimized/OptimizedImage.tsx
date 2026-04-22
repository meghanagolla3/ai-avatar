'use client'

import { useState, useRef, useEffect } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
  placeholder?: string
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  placeholder,
  blurDataURL,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading !== 'lazy') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [loading])

  // Generate responsive image sources
  const generateSrcSet = (baseSrc: string) => {
    const extensions = ['.webp', '.avif', '.jpg']
    const widths = [320, 640, 768, 1024, 1280, 1536]
    
    return widths
      .map(w => `${baseSrc.replace(/\.[^.]+$/, '')}-${w}w${extensions[0]} ${w}w`)
      .join(', ')
  }

  // Determine actual source to use
  const shouldLoad = loading === 'eager' || (loading === 'lazy' && isInView)
  const actualSrc = shouldLoad ? src : undefined
  const srcSet = shouldLoad ? generateSrcSet(src) : undefined

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Generate placeholder if blur data URL provided
  const placeholderStyle = blurDataURL ? {
    backgroundImage: `url(${blurDataURL})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: isLoaded ? 'none' : 'blur(20px)',
    transition: 'filter 0.3s ease-out',
  } : {}

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder or blur effect */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 flex items-center justify-center"
          style={placeholderStyle}
        >
          {placeholder && !blurDataURL && (
            <span className="text-gray-500 text-sm">{placeholder}</span>
          )}
        </div>
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={actualSrc}
        srcSet={srcSet}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${hasError ? 'hidden' : ''}
        `}
        sizes="(max-width: 640px) 320px, (max-width: 768px) 640px, (max-width: 1024px) 768px, (max-width: 1280px) 1024px, 1280px"
      />
    </div>
  )
}

// WebP/AVIF optimization helper
export function createOptimizedImageUrl(
  baseUrl: string,
  options: {
    width?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpg' | 'png'
  } = {}
): string {
  const { width = 1024, quality = 80, format = 'webp' } = options
  
  // Remove existing extension and query params
  const cleanUrl = baseUrl.split('?')[0].replace(/\.[^.]+$/, '')
  
  // Add optimization parameters
  const params = new URLSearchParams({
    w: width.toString(),
    q: quality.toString(),
    fm: format,
  })
  
  return `${cleanUrl}.${format}?${params.toString()}`
}

// Blur placeholder generator
export function generateBlurDataURL(
  width: number = 100,
  height: number = 100,
  color: string = '#e5e7eb'
): string {
  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}
