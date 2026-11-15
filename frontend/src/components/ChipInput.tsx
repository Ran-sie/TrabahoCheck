import { useState, type KeyboardEvent } from 'react'
import { useLang } from '../lib/lang-context'

const FOCUS = 'focus:outline-2 focus:outline-offset-2 focus:outline-brand'

interface Props {
  id: string
  label: string
  hint: string
  placeholder: string
  items: string[]
  onChange: (items: string[]) => void
  max: number
  maxLength: number
}

/** A list of short items shown as chips: type one, press Enter or Add, remove with the x. */
export default function ChipInput({ id, label, hint, placeholder, items, onChange, max, maxLength }: Props) {
  const { t } = useLang()
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim()
    setDraft('')
    if (value === '' || items.length >= max) return
    if (items.some((i) => i.toLowerCase() === value.toLowerCase())) return
    onChange([...items, value])
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter must add the chip, not submit the whole profile form.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>

      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1 rounded-full border border-line-strong bg-page py-1 pr-1 pl-3 text-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={t.removeItem(item)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-track hover:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={maxLength}
          disabled={items.length >= max}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={`${id}-hint`}
          className={`h-12 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-card px-4 text-base text-ink placeholder:text-muted disabled:opacity-50 ${FOCUS}`}
        />
        <button
          type="button"
          onClick={add}
          disabled={draft.trim() === '' || items.length >= max}
          className="h-12 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.addItem}
        </button>
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted">
        {hint}
      </p>
    </div>
  )
}
