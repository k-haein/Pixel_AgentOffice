// Tiny pub/sub bridge between Phaser scene, React components, and stores.

type Handler = (payload: unknown) => void

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

  emit(event: string, payload?: unknown) {
    if (!this.listeners[event]) return
    this.listeners[event].forEach(h => h(payload))
  }
}

export const eventBus = new EventBus()

/** Agent identity passed to chat popup */
export type ChatAgent = {
  id: string
  name: string
  role: string
  emoji: string
}

/** Backward compat (ChatPopup still imports `Agent`) */
export type Agent = ChatAgent
