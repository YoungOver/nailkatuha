import manifest from './works.json'

export type Length = 'short' | 'medium' | 'long' | 'extreme'
export type Style = 'nude' | 'french' | 'chrome' | 'art' | 'moodboard'

export type Work = {
  id: number
  w: number
  h: number
  widths: number[]
  blur: string
  length: Length
  styles: Style[]
  alt: string
}

export const lengthLabel: Record<Length, string> = {
  short: 'Короткие',
  medium: 'Средние',
  long: 'Длинные',
  extreme: 'Экстремальная длина',
}

export const styleLabel: Record<Style, string> = {
  nude: 'Нюд',
  french: 'Френч',
  chrome: 'Хром',
  art: 'Дизайн',
  moodboard: 'Мудборд',
}

const tags: Record<number, Pick<Work, 'length' | 'styles' | 'alt'>> = {
  1: { length: 'long', styles: ['art'], alt: 'Длинные ногти: бордо, объёмные белые банты и прозрачный хром' },
  2: { length: 'long', styles: ['chrome', 'art'], alt: 'Длинный квадрат: серебряный хром, жёлтое граффити и чёрно-белый узор' },
  3: { length: 'long', styles: ['art'], alt: 'Длинный миндаль: пастель с голубыми каплями и розовой спиралью' },
  4: { length: 'extreme', styles: ['chrome'], alt: 'Экстремальные стилеты с голографическим серебристо-голубым покрытием' },
  5: { length: 'long', styles: ['french'], alt: 'Длинный квадрат: белый френч с мерцанием' },
  6: { length: 'long', styles: ['moodboard', 'chrome'], alt: 'Длинный миндаль: розовый жемчужный хром рядом с референсом из атласа и лепестков' },
  7: { length: 'medium', styles: ['chrome', 'art'], alt: 'Средний миндаль: синий с серебряным хромом' },
  8: { length: 'extreme', styles: ['art'], alt: 'Экстремальные стилеты: небесно-голубой с облаками и хромом' },
  9: { length: 'medium', styles: ['moodboard', 'nude'], alt: 'Нюдовый миндаль с камешками рядом с референсом из цветущей сакуры' },
  10: { length: 'medium', styles: ['moodboard', 'french'], alt: 'Шоколадный френч рядом с референсом из пралине и шоколада' },
  11: { length: 'short', styles: ['moodboard'], alt: 'Короткий вишнёвый квадрат рядом с референсом из вишен и красной помады' },
  12: { length: 'medium', styles: ['moodboard', 'art'], alt: 'Дизайн в стиле Minecraft: крипер и пиксельные элементы рядом с референсом' },
  13: { length: 'long', styles: ['moodboard', 'french'], alt: 'Длинный розовый френч рядом с референсом из звёзд и бантов' },
  14: { length: 'medium', styles: ['moodboard'], alt: 'Лавандово-сливовый квадрат рядом с референсом из слив' },
  15: { length: 'short', styles: ['moodboard', 'chrome'], alt: 'Короткий мокко-хром рядом с гранжевым чёрно-красным референсом' },
  16: { length: 'long', styles: ['nude'], alt: 'Длинный нюдовый квадрат с мерцающими акцентами' },
  17: { length: 'short', styles: ['art'], alt: 'Короткие нюдовые ногти с чёрно-белой графикой' },
  18: { length: 'short', styles: ['chrome'], alt: 'Короткие ногти с золотым и серебряным хромом' },
}

export const works: Work[] = manifest.map((m) => ({ ...m, ...tags[m.id] }))

const base = process.env.NEXT_PUBLIC_BASE ?? ''

export function workSrc(work: Pick<Work, 'id'>, width: number, format: 'avif' | 'webp'): string {
  return `${base}/works/work-${work.id}-${width}.${format}`
}

export function srcSet(work: Pick<Work, 'id' | 'widths'>, format: 'avif' | 'webp'): string {
  return work.widths.map((w) => `${workSrc(work, w, format)} ${w}w`).join(', ')
}
