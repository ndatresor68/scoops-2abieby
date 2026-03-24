function createToneDataUrl({ frequency = 700, durationMs = 90, volume = 0.24 }) {
  const sampleRate = 44100
  const durationSeconds = durationMs / 1000
  const frameCount = Math.max(1, Math.floor(sampleRate * durationSeconds))
  const attackFrames = Math.max(1, Math.floor(frameCount * 0.08))
  const releaseFrames = Math.max(1, Math.floor(frameCount * 0.18))
  const samples = new Int16Array(frameCount)

  for (let index = 0; index < frameCount; index += 1) {
    let envelope = 1
    if (index < attackFrames) {
      envelope = index / attackFrames
    } else if (index > frameCount - releaseFrames) {
      envelope = (frameCount - index) / releaseFrames
    }

    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate)
    samples[index] = Math.max(-32767, Math.min(32767, sample * 32767 * volume * envelope))
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(offset, samples[index], true)
    offset += 2
  }

  let binary = ""
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }

  return `data:audio/wav;base64,${btoa(binary)}`
}

export const CHAT_SEND_SOUND = createToneDataUrl({
  frequency: 880,
  durationMs: 80,
  volume: 0.22,
})

export const CHAT_RECEIVE_SOUND = createToneDataUrl({
  frequency: 640,
  durationMs: 110,
  volume: 0.24,
})
