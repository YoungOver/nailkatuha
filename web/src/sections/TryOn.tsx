'use client'

import { useEffect, useRef, useState } from 'react'
import { LacquerPicker } from '@/components/LacquerPicker'
import { workSrc, works } from '@/content/works'
import { lacquerStore } from '@/fx/lacquer'
import type { TryOn as Engine, Look } from '@/fx/tryon/engine'

type Mode = 'idle' | 'loading' | 'camera' | 'photo' | 'error'

/* a studio photo where the whole hand is in frame, so the model finds it: the example works without a camera */
const SAMPLE = works.find((w) => w.id === 14)!

function look(): Look {
  const s = lacquerStore.get()
  return { hex: s.lacquer.hex, finish: s.finish, shape: s.shape, length: s.length }
}

/**
 * Try a lacquer on your own hands: the camera, an uploaded photo of a hand or
 * the studio example. Hand landmarks are found on the device by MediaPipe and
 * the nails are painted in the shade, finish and shape from the picker.
 */
export function TryOn() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const engine = useRef<Engine | null>(null)
  const still = useRef<ImageBitmap | HTMLImageElement | null>(null)
  const [mode, setMode] = useState<Mode>('idle')
  const [status, setStatus] = useState('')

  useEffect(() => () => engine.current?.close(), [])

  /* a still photo is repainted whenever the lacquer, finish or shape changes */
  useEffect(
    () =>
      lacquerStore.subscribe(() => {
        if (mode === 'photo' && still.current && engine.current && canvas.current) engine.current.photo(canvas.current, still.current, look())
      }),
    [mode],
  )

  const ready = async () => {
    if (engine.current) return engine.current
    setMode('loading')
    setStatus('Загружаю распознавание руки, около 8 МБ, один раз')
    engine.current = await (await import('@/fx/tryon/engine')).TryOn.load()
    return engine.current
  }

  const fail = (text: string) => {
    setMode('error')
    setStatus(text)
  }

  const startCamera = async () => {
    try {
      const e = await ready()
      e.stop()
      setStatus('Разрешите доступ к камере')
      await e.startCamera(video.current!)
      setMode('camera')
      setStatus('Покажите тыльную сторону ладони, пальцы вверх')
      e.run(canvas.current!, look, (nails) => {
        if (canvas.current) canvas.current.dataset.nails = String(nails)
        setStatus(nails ? 'Готово. Меняйте цвет, покрытие и форму' : 'Покажите тыльную сторону ладони, пальцы вверх')
      })
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      fail(denied ? 'Доступ к камере запрещён. Разрешите его в настройках браузера или загрузите фото руки.' : 'Камера недоступна. Загрузите фото руки или посмотрите пример.')
    }
  }

  const showPhoto = async (image: ImageBitmap | HTMLImageElement) => {
    try {
      const e = await ready()
      e.stop()
      still.current = image
      setMode('photo')
      const nails = await e.photo(canvas.current!, image, look())
      canvas.current!.dataset.nails = String(nails)
      setStatus(nails ? 'Готово. Меняйте цвет, покрытие и форму' : 'Не вижу ногтей на фото. Нужна тыльная сторона ладони при хорошем свете.')
    } catch {
      fail('Не получилось открыть фото. Попробуйте другое, в формате JPG или PNG.')
    }
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      await showPhoto(await createImageBitmap(f))
    } catch {
      fail('Не получилось открыть фото. Попробуйте другое, в формате JPG или PNG.')
    }
  }

  const sample = () => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => showPhoto(img)
    img.onerror = () => fail('Пример не загрузился. Проверьте соединение.')
    img.src = workSrc(SAMPLE, Math.max(...SAMPLE.widths), 'webp')
  }

  const save = () => {
    canvas.current?.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = 'nailkatuha-primerka.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    }, 'image/png')
  }

  const stopCamera = () => {
    engine.current?.stop()
    setMode('idle')
    setStatus('')
  }

  return (
    <section id="tryon" className="tryon" aria-labelledby="tryon-title">
      <div className="wrap tryon__grid">
        <div className="tryon__copy">
          <h2 id="tryon-title" className="section-title" data-reveal>
            Примерка на ваших руках
          </h2>
          <p className="section-lead" data-reveal>
            Включите камеру или загрузите фото руки: ногти окрасятся в выбранный лак, покрытие и форму. Распознавание работает в браузере,
            видео и фото никуда не отправляются.
          </p>
          <LacquerPicker />
          <div className="tryon__actions">
            {mode === 'camera' ? (
              <button type="button" className="lacquer-btn" onClick={stopCamera}>
                <span className="lacquer-btn__label">Выключить камеру</span>
              </button>
            ) : (
              <button type="button" className="lacquer-btn" onClick={startCamera} disabled={mode === 'loading'}>
                <span className="lacquer-btn__label">Включить камеру</span>
              </button>
            )}
            <button type="button" className="ghost-btn" onClick={() => file.current?.click()} disabled={mode === 'loading'}>
              Загрузить фото руки
            </button>
            <button type="button" className="ghost-btn" onClick={sample} disabled={mode === 'loading'}>
              Пример
            </button>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <p className="tryon__status" role="status" aria-live="polite">
            {status}
          </p>
        </div>

        <div className="tryon__stage" data-mode={mode}>
          <video ref={video} className="tryon__video" muted playsInline aria-hidden="true" />
          <canvas ref={canvas} className="tryon__canvas" aria-label="Результат примерки" role="img" />
          {mode === 'idle' && (
            <div className="tryon__hint" aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <path d="M22 34V14a4 4 0 0 1 8 0v16M30 30V10a4 4 0 0 1 8 0v20M38 30V13a4 4 0 0 1 8 0v21M46 34v-9a4 4 0 0 1 8 0v15c0 11-8 20-19 20h-3c-6 0-10-3-13-8l-8-13a4 4 0 0 1 7-4l3 4" />
              </svg>
              <span>Камера, фото руки или пример</span>
            </div>
          )}
          {mode === 'loading' && <div className="tryon__loading" aria-hidden="true" />}
          {(mode === 'photo' || mode === 'camera') && (
            <button type="button" className="icon-btn tryon__save" onClick={save} aria-label="Сохранить снимок">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
