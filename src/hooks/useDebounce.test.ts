import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from './useDebounce'

// Fake timers keep this deterministic. A real 300ms wait would make the test both slow and
// flaky on a loaded machine — and FR-021 forbids results that depend on timing luck.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('چارجر'))

    expect(result.current).toBe('چارجر')
  })

  it('does not emit the new value before the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'چا' },
    })

    rerender({ value: 'چارجر' })
    act(() => void vi.advanceTimersByTime(299))

    expect(result.current).toBe('چا')
  })

  it('emits the new value once the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'چا' },
    })

    rerender({ value: 'چارجر' })
    act(() => void vi.advanceTimersByTime(300))

    expect(result.current).toBe('چارجر')
  })

  it('emits only the final value when typing faster than the delay', () => {
    // This is the whole point of the hook: one search request per pause, not one per
    // keystroke. If the intermediate values leaked through, ProductPicker would fire a
    // request for every character.
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'م' },
    })

    rerender({ value: 'مو' })
    act(() => void vi.advanceTimersByTime(100))
    rerender({ value: 'موب' })
    act(() => void vi.advanceTimersByTime(100))
    rerender({ value: 'موبائل' })
    act(() => void vi.advanceTimersByTime(100))

    expect(result.current).toBe('م')

    act(() => void vi.advanceTimersByTime(300))
    expect(result.current).toBe('موبائل')
  })

  it('honours a custom delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    act(() => void vi.advanceTimersByTime(999))
    expect(result.current).toBe('a')

    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })

  it('works with a non-string value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 1 },
    })

    rerender({ value: 42 })
    act(() => void vi.advanceTimersByTime(300))

    expect(result.current).toBe(42)
  })

  it('clears its pending timer on unmount', () => {
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    const { unmount } = renderHook(() => useDebounce('چارجر'))

    unmount()

    // A leaked timer would call setState on an unmounted component.
    expect(clearSpy).toHaveBeenCalled()
  })
})
