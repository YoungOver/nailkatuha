import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/*
 * Large binaries for the hand try-on are not kept in git: the MediaPipe wasm
 * comes from node_modules and the hand model from the official MediaPipe
 * storage (or a local copy given in HAND_MODEL). Runs before every build.
 */

const pub = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url))
const wasmDir = fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url))
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const MODEL_MIN_BYTES = 7_000_000

mkdirSync(pub('mediapipe'), { recursive: true })
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  copyFileSync(wasmDir + f, pub(`mediapipe/${f}`))
}

mkdirSync(pub('models'), { recursive: true })
const model = pub('models/hand_landmarker.task')
if (!existsSync(model) || statSync(model).size < MODEL_MIN_BYTES) {
  if (process.env.HAND_MODEL && existsSync(process.env.HAND_MODEL)) {
    copyFileSync(process.env.HAND_MODEL, model)
  } else {
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`hand model: HTTP ${res.status}`)
    writeFileSync(model, Buffer.from(await res.arrayBuffer()))
  }
}
const size = statSync(model).size
if (size < MODEL_MIN_BYTES) throw new Error(`hand model looks truncated: ${size} bytes`)
console.log(`try-on assets ready: wasm x4, model ${(size / 1e6).toFixed(1)} MB`)
