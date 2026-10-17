export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'failed' | 'conflict'

/** One write queue per editor. An acknowledgement covers only its captured edit. */
export class RevisionSaver<T> {
  private edit = 0
  private acknowledged = 0
  private queue: Promise<unknown> = Promise.resolve()
  private blocked = false
  status: SaveStatus = 'saved'
  error: string | null = null

  constructor(
    public value: T,
    public serverRevision: number,
    private persist: (value: T, expectedRevision: number) => Promise<number>,
    private notify: (status: SaveStatus) => void = () => {},
  ) {}

  get dirty() { return this.edit !== this.acknowledged }

  change(value: T) {
    this.value = value
    this.edit += 1
    if (!this.blocked) this.setStatus('unsaved')
  }

  private setStatus(status: SaveStatus) {
    this.status = status
    this.notify(status)
  }

  private async drain() {
    if (this.blocked) throw new Error(this.error || 'Conflicting modification')
    while (this.dirty) {
      const edit = this.edit
      const snapshot = this.value
      this.setStatus('saving')
      try {
        this.serverRevision = await this.persist(snapshot, this.serverRevision)
        this.acknowledged = edit
        this.error = null
      } catch (error) {
        this.blocked = error instanceof Error && 'status' in error && error.status === 409
        this.error = error instanceof Error ? error.message : 'Save failed. Please retry.'
        this.setStatus(this.blocked ? 'conflict' : 'failed')
        throw error
      }
    }
    this.setStatus('saved')
  }

  private enqueue<R>(operation: () => Promise<R>): Promise<R> {
    const result = this.queue.then(operation, operation)
    // A failed save must not poison subsequent explicit retries.
    this.queue = result.catch(() => {})
    return result
  }

  flush(): Promise<void> { return this.enqueue(() => this.drain()) }

  exclusive<R>(operation: (snapshot: T, revision: number) => Promise<{ result: R; revision?: number }>): Promise<R> {
    return this.enqueue(async () => {
      await this.drain()
      try {
        const response = await operation(this.value, this.serverRevision)
        if (response.revision !== undefined) this.serverRevision = response.revision
        return response.result
      } catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 409) {
          this.blocked = true
          this.error = error.message
          this.setStatus('conflict')
        }
        throw error
      }
    })
  }
}
