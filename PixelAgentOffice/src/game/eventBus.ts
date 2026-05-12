// Tiny pub/sub bridge between Phaser scene and React components.
// Phaser fires events here; React listens via useEffect.

type Handler = (payload: any) => void

class EventBus {
  private listeners: Record<string, Handler[]> = {}

  on(event: string, handler: Handler) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(handler)
  }

  off(event: string, handler: Handler) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter(h => h !== handler)
  }

  emit(event: string, payload?: any) {
    if (!this.listeners[event]) return
    this.listeners[event].forEach(h => h(payload))
  }
}

export const eventBus = new EventBus()

export type Agent = {
  id: string
  name: string
  role: string
  emoji: string
}
