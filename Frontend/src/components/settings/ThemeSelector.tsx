import { typography } from '../../styles/typography.ts'
import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

import type { ThemePreference } from '../../theme/theme.ts'

export type { ThemePreference }

const themes: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function PreviewSurface({ dark = false }: { dark?: boolean }) {
  const historyClassName = `h-[0.5rem] rounded-[0.3125rem] ${dark ? 'bg-[#51595a]' : 'bg-[#c6d8cf]'}`
  const lineClassName = `h-[0.5rem] rounded-[0.3125rem] ${dark ? 'bg-[#454b4d]' : 'bg-[#dfe2e3]'}`

  return (
    <div className={`flex h-full w-full ${dark ? 'bg-[#202526]' : 'bg-white'}`}>
      <div className={`flex w-[30%] shrink-0 flex-col px-[0.75rem] py-[0.625rem] [@media(min-width:600px)_and_(max-width:1199px)]:px-[0.5rem] ${dark ? 'bg-[#2d3435]' : 'bg-[#f0f2ef]'}`}>
        <span className="size-[1.1875rem] rounded-[0.25rem] bg-[#147765]" />
        <span className={`mt-[0.5625rem] ${historyClassName}`} />
        <span className={`mt-[0.4375rem] w-[68%] ${historyClassName}`} />
        {dark && <span className={`mt-[0.4375rem] w-[68%] ${historyClassName}`} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-[0.9375rem] py-[1.0625rem] [@media(min-width:600px)_and_(max-width:1199px)]:px-[0.625rem]">
        <span className={`mb-[1.0625rem] h-[0.5rem] w-[2.625rem] rounded-[0.375rem] ${dark ? 'bg-[#454b4d]' : 'bg-[#dfe2e3]'}`} />
        <span className={`w-[90%] ${lineClassName}`} />
        <span className={`mt-[0.5rem] w-[72%] ${lineClassName}`} />
        {dark && <span className={`mt-[0.5rem] w-[60%] ${lineClassName}`} />}
      </div>
    </div>
  )
}

export default function ThemeSelector({
  value,
  onThemeChange,
}: {
  value: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': next = (index + 1) % themes.length; break
      case 'ArrowLeft':
      case 'ArrowUp': next = (index + themes.length - 1) % themes.length; break
      case 'Home': next = 0; break
      case 'End': next = themes.length - 1; break
      default: return
    }
    event.preventDefault()
    onThemeChange(themes[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Theme" aria-describedby="theme-description" className="grid grid-cols-1 gap-4 @min-[37.5rem]:grid-cols-2">
      {themes.map((theme, index) => {
        const selected = theme.value === value
        return (
          <button
            key={theme.value}
            ref={(element) => { refs.current[index] = element }}
            type="button"
            role="radio"
            aria-label={`${theme.label} theme`}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onThemeChange(theme.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`${typography.label} theme-option relative flex min-w-0 cursor-pointer flex-col items-center rounded-[0.625rem] border px-[1.875rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-alt [@media(min-width:600px)_and_(max-width:1199px)]:px-[0.875rem] ${theme.value === 'light' ? 'pt-[1.5rem] pb-[0.6875rem]' : 'pt-[1.4375rem] pb-[0.75rem]'} ${selected ? 'border-brand bg-hover ring-[0.03125rem] ring-brand' : 'border-line bg-surface hover:border-line-strong'}`}
          >
            <div aria-hidden="true" className={`theme-preview relative w-full overflow-hidden rounded-[0.4375rem] border border-line max-w-[15.25rem] ${theme.value === 'light' ? 'h-[6.5rem]' : 'h-[6.6875rem]'}`}>
              <PreviewSurface dark={theme.value === 'dark'} />
            </div>
            <span className={theme.value === 'light' ? 'mt-[0.8125rem]' : 'mt-[0.625rem]'}>{theme.label}</span>
            {selected && (
              <span aria-hidden="true" className="absolute top-3 right-3 flex size-[1.8125rem] items-center justify-center rounded-full bg-brand text-on-brand shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
