import { describe, expect, it } from 'vitest'

/**
 * Proves the frontend harness reports honestly before any real coverage is written against
 * it. The first assertion below was written wrong, run, and watched failing (T015) before
 * being corrected — that observation is the only thing that makes the suite trustworthy.
 */
describe('frontend harness', () => {
  it('reports failure when an assertion is false', () => {
    expect(2 + 2).toBe(4)
  })

  it('runs in a jsdom environment with localStorage available', () => {
    // The i18n provider and the auth hook both read localStorage synchronously on first
    // render, so the environment must supply it.
    localStorage.setItem('probe', 'value')
    expect(localStorage.getItem('probe')).toBe('value')
    expect(typeof document).toBe('object')
  })

  it('has jest-dom matchers registered', () => {
    const el = document.createElement('div')
    el.textContent = 'موبائل چارجر'
    document.body.appendChild(el)

    expect(el).toBeInTheDocument()
    expect(el).toHaveTextContent('موبائل چارجر')
  })
})
