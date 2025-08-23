// Prefetch Service
class PrefetchService {
  constructor() {
    this.cache = new Map()
    this.prefetchQueue = new Set()
    this.observers = new Map()
    this.maxCacheSize = 50
    this.prefetchDelay = 100
    this.requestPriority = {
      high: [],
      medium: [],
      low: []
    }
  }
  // Cache management with LRU eviction
  setCache(key, data, ttl = 300000) { // 5 minutes TTL
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    })
  }

  getCache(key) {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // Check TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }
    
    cached.accessCount++
    return cached.data
  }

  // prefetching with priority queue
  async prefetch(url, priority = 'medium', options = {}) {
    const cacheKey = `prefetch_${url}`
    
    // Skip if already cached or in queue
    if (this.getCache(cacheKey) || this.prefetchQueue.has(url)) {
      return Promise.resolve(this.getCache(cacheKey))
    }

    this.prefetchQueue.add(url)
    this.requestPriority[priority].push({ url, options, cacheKey })
    
    return this.processQueue()
  }

  async processQueue() {
    // Process high priority first
    for (const priority of ['high', 'medium', 'low']) {
      while (this.requestPriority[priority].length > 0) {
        const { url, options, cacheKey } = this.requestPriority[priority].shift()
        
        try {
          // Add small delay before each request (to avoid spamming server)
          await new Promise(resolve => setTimeout(resolve, this.prefetchDelay))
          
          const response = await fetch(url, {
            ...options,
            headers: {
              'Cache-Control': 'max-age=300',
              ...options.headers
            }
          }).then(res=>res.json())
          
          if (response.ok) {
            const data = await response.json()
            this.setCache(cacheKey, data)
            this.prefetchQueue.delete(url)
            return data
          }
        } catch (error) {
          console.warn(`Prefetch failed for ${url}:`, error)
          this.prefetchQueue.delete(url)
        }
      }
    }
  }

  // Intersection Observer for viewport-based prefetching
  observeElement(element, callback, options = {}) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target)
        }
      })
    }, {
      rootMargin: options.rootMargin || '100px',
      threshold: options.threshold || 0.1
    })

    observer.observe(element)
    this.observers.set(element, observer)
    return observer
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
  }
}

// Mouse tracking for hover predictions
class HoverPredictor {
  constructor(prefetchService) {
    this.prefetchService = prefetchService
    this.mouseTrajectory = []
    this.hoverIntentTimeout = null
    this.trajectoryTimeout = 200
  }

  trackMouse(event) {
    this.mouseTrajectory.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    })

    // Keep only recent trajectory data
    const cutoff = Date.now() - this.trajectoryTimeout
    this.mouseTrajectory = this.mouseTrajectory.filter(
      point => point.timestamp > cutoff
    )
  }

  predictHoverIntent(target, prefetchCallback) {
    clearTimeout(this.hoverIntentTimeout)
    
    this.hoverIntentTimeout = setTimeout(() => {
      const targetRect = target.getBoundingClientRect()
      const trajectory = this.mouseTrajectory.slice(-3)
      
      if (trajectory.length >= 2) {
        const isMovingToward = this.isMovingTowardTarget(trajectory, targetRect)
        if (isMovingToward) {
          prefetchCallback()
        }
      }
    }, 150) // Delay to confirm intent
  }

  isMovingTowardTarget(trajectory, targetRect) {
    if (trajectory.length < 2) return false
    
    const latest = trajectory[trajectory.length - 1]
    const previous = trajectory[trajectory.length - 2]
    
    const targetCenter = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2
    }
    
    const previousDistance = Math.sqrt(
      Math.pow(previous.x - targetCenter.x, 2) + 
      Math.pow(previous.y - targetCenter.y, 2)
    )
    
    const currentDistance = Math.sqrt(
      Math.pow(latest.x - targetCenter.x, 2) + 
      Math.pow(latest.y - targetCenter.y, 2)
    )
    
    return currentDistance < previousDistance
  }
}

export default {
  setup() {
    const products = ref([])
    const loading = ref(true)
    const prefetchService = new PrefetchService()
    const hoverPredictor = new HoverPredictor(prefetchService)
    
    // Mock product data
    const mockProducts = [
      { id: 1, name: 'Premium Headphones', price: 299, image: 'https://via.placeholder.com/200x200/3B82F6/white?text=Headphones' },
      { id: 2, name: 'Smart Watch', price: 399, image: 'https://via.placeholder.com/200x200/EF4444/white?text=Watch' },
    ]

    const selectedProduct = ref(null)
    const productDetails = ref(null)
    const prefetchStats = reactive({
      cached: 0,
      hits: 0,
      misses: 0
    })

    // API calls
    const fetchProducts = () => {
      return new Promise(resolve => {
        setTimeout(() => resolve(mockProducts), 800)
      })
    }

    const fetchProductDetails = (productId) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const product = mockProducts.find(p => p.id === productId)
          resolve({
            ...product,
            description: `Detailed description for ${product.name}. This is a high-quality product with advanced features.`,
            specifications: ['Feature 1', 'Feature 2', 'Feature 3'],
            reviews: Math.floor(Math.random() * 1000) + 100,
            rating: (Math.random() * 2 + 3).toFixed(1)
          })
        }, 300)
      })
    }

    // Prefetch product details
    const prefetchProductDetails = async (productId, priority = 'medium') => {
      const url = `/api/products/${productId}`
      const cached = prefetchService.getCache(`prefetch_${url}`)
      
      if (cached) {
        prefetchStats.hits++
        return cached
      }
      prefetchStats.misses++

      // 2. Add to queue instead of fetching directly
      const result=await prefetchService.prefetch(url, priority,{url, productId });

      return result; // Data will be available later in cache
    }
    // Handle product card interactions
    const handleProductHover = (product) => {
      prefetchProductDetails(product.id, 'high')
    }

    const handleProductClick = async (product) => {
      selectedProduct.value = product
      // Try to get from cache first
      const cached = prefetchService.getCache(`prefetch_/api/products/${product.id}`)
      
      if (cached) {
        productDetails.value = cached
        prefetchStats.hits++
      } else {
        productDetails.value = null
        productDetails.value = await fetchProductDetails(product.id)
        prefetchStats.misses++
      }
    }

    const closeProductDetails = () => {
      selectedProduct.value = null
      productDetails.value = null
    }

    // Setup intersection observer for viewport-based prefetching
    const setupViewportPrefetching = () => {
      nextTick(() => {
        const productCards = document.querySelectorAll('.product-card')
        
        productCards.forEach((card, index) => {
          prefetchService.observeElement(card, (element) => {
            const productId = parseInt(element.dataset.productId)
            if (productId) {
              prefetchProductDetails(productId, 'low')
            }
          }, { rootMargin: '50px' })
        })
      })
    }

    // Mouse tracking setup
    const setupMouseTracking = () => {
      document.addEventListener('mousemove', (e) => {
        hoverPredictor.trackMouse(e)
      })
    }

    // Initialize
    onMounted(async () => {
      products.value = await fetchProducts()
      loading.value = false
      
      await nextTick()
      setupViewportPrefetching()
      setupMouseTracking()
      
      // Prefetch popular products immediately
      const popularProducts = products.value.slice(0, 2)
      popularProducts.forEach(product => {
        prefetchProductDetails(product.id, 'high')
      })
    })

    onUnmounted(() => {
      prefetchService.cleanup()
    })

    return {
      products,
      loading,
      selectedProduct,
      productDetails,
      prefetchStats,
      handleProductHover,
      handleProductClick,
      closeProductDetails
    }
  }
}