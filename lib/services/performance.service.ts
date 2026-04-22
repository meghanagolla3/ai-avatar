export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  timestamp: number
  tags?: string[]
  context?: Record<string, any>
}

export interface PageLoadMetrics {
  url: string
  loadTime: number
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number
  resourcesLoaded: number
  timestamp: number
}

export interface CoreWebVitals {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
}

export class PerformanceService {
  private static instance: PerformanceService
  private metrics: PerformanceMetric[] = []
  private pageMetrics: PageLoadMetrics[] = []
  private observers: PerformanceObserver[] = []
  private maxMetrics = 1000

  private constructor() {}

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService()
    }
    return PerformanceService.instance
  }

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    if (typeof window === 'undefined') return

    // Monitor page load performance
    this.monitorPageLoad()

    // Monitor Core Web Vitals
    this.observeCoreWebVitals()

    // Monitor resource loading
    this.observeResources()

    // Monitor long tasks
    this.observeLongTasks()
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    }

    this.metrics.push(fullMetric)
    this.trimMetrics()

    // Send to monitoring service
    this.sendMetric(fullMetric)
  }

  /**
   * Measure function execution time
   */
  measureTime<T>(
    name: string,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()

    this.recordMetric({
      name: `${name}_duration`,
      value: endTime - startTime,
      unit: 'ms',
      tags: ['function_timing'],
      context,
    })

    return result
  }

  /**
   * Measure async function execution time
   */
  async measureAsyncTime<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()

    this.recordMetric({
      name: `${name}_async_duration`,
      value: endTime - startTime,
      unit: 'ms',
      tags: ['async_timing'],
      context,
    })

    return result
  }

  /**
   * Monitor page load performance
   */
  private monitorPageLoad(): void {
    if (typeof window === 'undefined' || !window.performance) return

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const pageMetrics: PageLoadMetrics = {
          url: window.location.href,
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: this.getFirstPaint(),
          firstContentfulPaint: this.getFirstContentfulPaint(),
          resourcesLoaded: this.getResourceCount(),
          timestamp: Date.now(),
        }

        this.pageMetrics.push(pageMetrics)
        this.sendPageMetrics(pageMetrics)
      }
    })
  }

  /**
   * Get first paint time
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
    return firstPaint ? firstPaint.startTime : 0
  }

  /**
   * Get first contentful paint time
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0
  }

  /**
   * Get resource count
   */
  private getResourceCount(): number {
    return performance.getEntriesByType('resource').length
  }

  /**
   * Observe Core Web Vitals
   */
  private observeCoreWebVitals(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    // Observe Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        this.recordMetric({
          name: 'lcp',
          value: entry.startTime,
          unit: 'ms',
          tags: ['web_vital', 'paint'],
        })
      })
    })

    // Observe First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.name === 'first-input') {
          this.recordMetric({
            name: 'fid',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
            tags: ['web_vital', 'interaction'],
          })
        }
      })
    })

    // Observe Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.name === 'layout-shift') {
          this.recordMetric({
            name: 'cls',
            value: entry.value,
            unit: 'count',
            tags: ['web_vital', 'layout'],
          })
        }
      })
    })

    // Start observing
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      fidObserver.observe({ entryTypes: ['first-input'] })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      
      this.observers.push(lcpObserver, fidObserver, clsObserver)
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }

  /**
   * Observe resource loading
   */
  private observeResources(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        this.recordMetric({
          name: `resource_${entry.name}`,
          value: entry.duration,
          unit: 'ms',
          tags: ['resource', 'network'],
          context: {
            size: entry.transferSize,
            type: entry.initiatorType,
          },
        })
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (error) {
      console.warn('Resource observation not supported:', error)
    }
  }

  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    if (typeof window === 'undefined') return

    // Check for PerformanceObserver support
    if (!('PerformanceObserver' in window)) return

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          this.recordMetric({
            name: 'long_task',
            value: entry.duration,
            unit: 'ms',
            tags: ['performance', 'blocking'],
            context: {
              startTime: entry.startTime,
              attribution: entry.attribution,
            },
          })
        })
      })

      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    } catch (error) {
      console.warn('Long task observation not supported:', error)
    }
  }

  /**
   * Send metric to monitoring service
   */
  private async sendMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      })
    } catch (error) {
      console.warn('Failed to send performance metric:', error)
    }
  }

  /**
   * Send page metrics to monitoring service
   */
  private async sendPageMetrics(metrics: PageLoadMetrics): Promise<void> {
    try {
      await fetch('/api/performance/page-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      })
    } catch (error) {
      console.warn('Failed to send page metrics:', error)
    }
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-count)
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name)
  }

  /**
   * Get metrics by tags
   */
  getMetricsByTags(tags: string[]): PerformanceMetric[] {
    return this.metrics.filter(metric => 
      metric.tags && metric.tags.some(tag => tags.includes(tag))
    )
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalMetrics: number
    averageResponseTime: number
    slowestQueries: PerformanceMetric[]
    errorRate: number
  } {
    const responseTimeMetrics = this.metrics.filter(m => m.unit === 'ms')
    const averageResponseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length 
      : 0

    const slowestQueries = responseTimeMetrics
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const errorMetrics = this.metrics.filter(m => m.tags?.includes('error'))
    const errorRate = this.metrics.length > 0 ? (errorMetrics.length / this.metrics.length) * 100 : 0

    return {
      totalMetrics: this.metrics.length,
      averageResponseTime,
      slowestQueries,
      errorRate,
    }
  }

  /**
   * Trim metrics to prevent memory leaks
   */
  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Singleton instance
export const performanceService = PerformanceService.getInstance()

// Convenience functions
export const measurePerformance = <T>(
  name: string,
  fn: () => T,
  context?: Record<string, any>
) => performanceService.measureTime(name, fn, context)

export const measureAsyncPerformance = <T>(
  name: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
) => performanceService.measureAsyncTime(name, fn, context)

export const recordCustomMetric = (
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  context?: Record<string, any>
) => performanceService.recordMetric({ name, value, unit, context })

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])

  useEffect(() => {
    performanceService.initialize()

    const updateMetrics = () => {
      setMetrics(performanceService.getRecentMetrics(50))
    }

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000)

    return () => {
      clearInterval(interval)
      performanceService.destroy()
    }
  }, [])

  return {
    metrics,
    recordMetric: performanceService.recordMetric.bind(performanceService),
    measureTime: performanceService.measureTime.bind(performanceService),
    measureAsyncTime: performanceService.measureAsyncTime.bind(performanceService),
  }
}
