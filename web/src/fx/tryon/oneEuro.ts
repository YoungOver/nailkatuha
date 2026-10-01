/*
 * The One Euro filter (Casiez, Roussel, Vogel, 2012): a low-pass filter whose
 * cutoff rises with speed. A still hand gets heavy smoothing, so the nails do
 * not shiver; a moving hand gets almost none, so they do not trail behind.
 */

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

export class OneEuro {
  private x: number | null = null
  private dx = 0
  private t = 0

  constructor(
    private minCutoff = 1.2,
    private beta = 8,
    private dCutoff = 1,
  ) {}

  filter(value: number, time: number) {
    if (this.x === null) {
      this.x = value
      this.t = time
      return value
    }
    const dt = Math.max(1e-3, time - this.t)
    this.t = time
    const rawDx = (value - this.x) / dt
    this.dx += alpha(this.dCutoff, dt) * (rawDx - this.dx)
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx)
    this.x += alpha(cutoff, dt) * (value - this.x)
    return this.x
  }

  reset() {
    this.x = null
    this.dx = 0
  }
}
