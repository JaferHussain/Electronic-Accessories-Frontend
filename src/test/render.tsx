import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider, LANGUAGE_KEY, type Language } from '../i18n'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Which language the tree renders in. Every user-facing test should run both (FR-015). */
  language?: Language
  /** Initial route for components that read router state. */
  route?: string
}

/**
 * Renders a component inside the providers it actually needs, so tests exercise the real
 * i18n, query, and routing behaviour rather than a simplified stand-in.
 *
 * Retries are disabled: a failing request should surface immediately as an error state
 * rather than being retried three times into a test timeout.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { language = 'ur', route = '/', ...rest } = options

  // I18nProvider reads this synchronously on first render.
  localStorage.setItem(LANGUAGE_KEY, language)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </I18nProvider>
      </QueryClientProvider>
    )
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...rtlRender(ui, { wrapper: Wrapper, ...rest }),
  }
}

/** Both languages, for parameterising a test across the bilingual contract. */
export const BOTH_LANGUAGES: Language[] = ['ur', 'en']
