type CounterMap = Record<string, number>

type TimingMap = Record<string, number[]>

class MetricsStore {
  private counters: CounterMap = {}
  private timings: TimingMap = {}

  inc(name: string, value = 1) {
    this.counters[name] = (this.counters[name] ?? 0) + value
  }

  observe(name: string, durationMs: number) {
    if (!this.timings[name]) this.timings[name] = []
    this.timings[name].push(durationMs)
  }

  snapshot() {
    return {
      counters: { ...this.counters },
      timings: { ...this.timings }
    }
  }

  reset() {
    this.counters = {}
    this.timings = {}
  }
}

export const metrics = new MetricsStore()
