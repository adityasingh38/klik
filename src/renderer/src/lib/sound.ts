/**
 * The klik. The app is named after a sound it has never made.
 *
 * Synthesised rather than shipped as a file: it's a few hundred bytes of code instead
 * of an audio asset, it needs no loading state, and every part of it stays tunable —
 * a mechanical click is a sharp noise transient over a short pitch drop, which is
 * exactly what these two nodes are.
 *
 * Rules it follows: only on success, never on hover, never on failure, and never
 * without the user's preference behind it.
 */
let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  // Autoplay policy suspends the context until a gesture; installs are always a
  // gesture, so resuming here is safe and keeps the first click from being silent.
  if (context.state === 'suspended') void context.resume()
  return context
}

/** The seat: a body that drops in pitch, with a transient edge on top of it. */
export function playKlik(volume = 0.22): void {
  const ctx = audioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = volume
  master.connect(ctx.destination)

  // Body — the weight of something seating into place.
  const body = ctx.createOscillator()
  body.type = 'sine'
  body.frequency.setValueAtTime(190, now)
  body.frequency.exponentialRampToValueAtTime(58, now + 0.055)

  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(0.0001, now)
  bodyGain.gain.exponentialRampToValueAtTime(1, now + 0.004)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085)

  body.connect(bodyGain).connect(master)
  body.start(now)
  body.stop(now + 0.1)

  // Edge — a very short filtered noise burst; this is what reads as "mechanical"
  // rather than "notification chime".
  const frames = Math.floor(ctx.sampleRate * 0.03)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 2400
  bandpass.Q.value = 1.1

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.5, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)

  noise.connect(bandpass).connect(noiseGain).connect(master)
  noise.start(now)
  noise.stop(now + 0.04)
}
