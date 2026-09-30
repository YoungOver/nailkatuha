import { srcSet, workSrc, type Work } from '@/content/works'

type Props = {
  work: Work
  sizes: string
  priority?: boolean
  className?: string
}

export function WorkImage({ work, sizes, priority, className }: Props) {
  const fallback = work.widths[Math.min(1, work.widths.length - 1)]
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(work, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(work, 'webp')} sizes={sizes} />
      <img
        src={workSrc(work, fallback, 'webp')}
        alt={work.alt}
        width={work.w}
        height={work.h}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={className}
        style={{ backgroundImage: `url(${work.blur})`, backgroundSize: 'cover' }}
      />
    </picture>
  )
}
