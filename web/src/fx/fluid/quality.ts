export type Quality = 'low' | 'mid' | 'high'

export type Device = { cores: number; coarse: boolean; width: number; memory: number }

export const QUALITY: Record<Quality, { sim: number; dye: number; pressureIters: number }> = {
  low: { sim: 64, dye: 512, pressureIters: 12 },
  mid: { sim: 96, dye: 768, pressureIters: 16 },
  high: { sim: 128, dye: 1024, pressureIters: 20 },
}

export function pickQuality({ cores, coarse, width, memory }: Device): Quality {
  if (memory <= 2 || cores <= 4 || (coarse && width < 700)) return 'low'
  if (coarse) return 'mid'
  return 'high'
}

export function simSize(width: number, height: number, short: number): { w: number; h: number } {
  const ratio = Math.max(width, height) / Math.min(width, height)
  const long = Math.round(short * ratio)
  return width >= height ? { w: long, h: short } : { w: short, h: long }
}

export function detectDevice(): Device {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    cores: nav.hardwareConcurrency || 4,
    coarse: matchMedia('(pointer: coarse)').matches,
    width: Math.min(screen.width, screen.height) < 700 ? Math.min(innerWidth, innerHeight) : innerWidth,
    memory: nav.deviceMemory ?? 8,
  }
}
