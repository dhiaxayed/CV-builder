/** Keep one expensive task running and replace queued work with the newest edit.
 * Cancelling a browser request does not stop a remote LaTeX process. Let it
 * finish, discard obsolete results, then compile only the latest pending draft.
 */
export class LatestTask<T, R> {
  private generation = 0
  private pending: { value:T; generation:number; ready:boolean } | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private running = false
  private disposed = false

  constructor(
    private run: (value:T, isCurrent:() => boolean) => Promise<R>,
    private success: (result:R, value:T) => void,
    private failure: (error:unknown) => void,
  ) {}

  schedule(value:T, delay=1200) {
    if (this.disposed) return
    clearTimeout(this.timer)
    const job = { value,generation:++this.generation,ready:false }
    this.pending = job
    this.timer = setTimeout(() => { job.ready=true; void this.drain() },delay)
  }

  pause() {
    clearTimeout(this.timer)
    this.generation++
    this.pending=null
  }

  dispose() { this.disposed=true; this.pause() }

  private async drain() {
    if (this.running || !this.pending?.ready || this.disposed) return
    const job=this.pending
    this.pending=null
    this.running=true
    const isCurrent=() => !this.disposed && job.generation===this.generation
    try {
      const result=await this.run(job.value,isCurrent)
      if (isCurrent()) this.success(result,job.value)
    } catch (error) {
      if (isCurrent()) this.failure(error)
    } finally {
      this.running=false
      void this.drain()
    }
  }
}
