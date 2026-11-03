type DayactBrandProps = {
  size?: 'header' | 'hero'
  className?: string
}

export function DayactBrand({ size = 'header', className = '' }: DayactBrandProps) {
  const markSize = size === 'hero' ? 'h-14 w-14' : 'h-9 w-9'
  const nameClass = size === 'hero' ? 'dayact-brand__name dayact-brand__name--hero' : 'dayact-brand__name'
  const NameTag = size === 'hero' ? 'h1' : 'span'

  return (
    <div className={`dayact-brand ${className}`.trim()}>
      <img
        src="/icon.svg"
        alt=""
        className={`dayact-brand__mark ${markSize}`}
        width={size === 'hero' ? 56 : 36}
        height={size === 'hero' ? 56 : 36}
        aria-hidden
      />
      <NameTag className={nameClass}>Dayact</NameTag>
    </div>
  )
}
