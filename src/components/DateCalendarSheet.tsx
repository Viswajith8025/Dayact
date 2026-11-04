import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Button } from './Button'
import { SheetPortal } from './SheetPortal'
import { localDateString, parsePlannedDate } from '../lib/activities'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type DateCalendarSheetProps = {
  open: boolean
  onClose: () => void
  value: string
  onSelect: (date: string) => void
  /** When opened from another sheet, stack above it */
  layer?: 'default' | 'nested'
}

export function DateCalendarSheet({
  open,
  onClose,
  value,
  onSelect,
  layer = 'default',
}: DateCalendarSheetProps) {
  const selected = parsePlannedDate(value) ? parseISO(value) : new Date()
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected))
  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!open) return
    const parsed = parsePlannedDate(value) ? parseISO(value) : new Date()
    setVisibleMonth(startOfMonth(parsed))
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const cells = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [visibleMonth])

  if (!open) return null

  const backdropClass =
    layer === 'nested'
      ? 'sheet-backdrop z-[65]'
      : 'sheet-backdrop'

  function pick(day: Date) {
    onSelect(localDateString(day))
    onClose()
  }

  return (
    <SheetPortal>
      <div
        className={backdropClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-calendar-title"
        onClick={onClose}
      >
        <div
          className={`sheet-panel space-y-[var(--space-4)]${layer === 'nested' ? ' z-[66]' : ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sheet-grabber" aria-hidden />
          <div className="flex items-center justify-between gap-[var(--space-2)]">
            <h2 id="date-calendar-title" className="typo-title text-[var(--color-text)]">
              Pick a date
            </h2>
            <Button type="button" variant="tertiary" onClick={() => pick(today)}>
              Today
            </Button>
          </div>

          <div className="flex items-center justify-between gap-[var(--space-2)]">
            <Button
              type="button"
              variant="tertiary"
              aria-label="Previous month"
              onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            >
              ‹
            </Button>
            <p className="typo-headline tabular-nums text-[var(--color-text)]">
              {format(visibleMonth, 'MMMM yyyy')}
            </p>
            <Button
              type="button"
              variant="tertiary"
              aria-label="Next month"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            >
              ›
            </Button>
          </div>

          <div className="date-calendar-grid" role="grid" aria-label={format(visibleMonth, 'MMMM yyyy')}>
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="date-calendar-weekday typo-caption text-[var(--color-text-muted)]">
                {label}
              </span>
            ))}
            {cells.map((day) => {
              const inMonth = isSameMonth(day, visibleMonth)
              const isSelected = isSameDay(day, selected)
              const isToday = isSameDay(day, today)
              const dateStr = localDateString(day)
              return (
                <button
                  key={dateStr}
                  type="button"
                  role="gridcell"
                  aria-label={format(day, 'EEEE, d MMMM yyyy')}
                  aria-selected={isSelected}
                  className={`date-calendar-day typo-subhead tabular-nums${
                    inMonth ? '' : ' date-calendar-day--muted'
                  }${isSelected ? ' date-calendar-day--selected' : ''}${
                    isToday ? ' date-calendar-day--today' : ''
                  }`}
                  onClick={() => pick(day)}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}

type DatePickFieldProps = {
  label: string
  name: string
  value: string
  onChange: (date: string) => void
  required?: boolean
}

export function DatePickField({ label, name, value, onChange, required }: DatePickFieldProps) {
  const [open, setOpen] = useState(false)
  const parsed = parsePlannedDate(value)
  const display = parsed ? format(parseISO(value), 'EEE, d MMM yyyy') : 'Pick a date'

  return (
    <>
      <label className="flex flex-col gap-[var(--space-2)] typo-footnote text-[var(--color-text-muted)]">
        <span>
          {label}
          {required ? ' *' : ''}
        </span>
        <button
          type="button"
          name={name}
          className="field-input text-left tabular-nums"
          aria-required={required}
          onClick={() => setOpen(true)}
        >
          {display}
        </button>
      </label>
      <DateCalendarSheet
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onSelect={onChange}
        layer="nested"
      />
    </>
  )
}
