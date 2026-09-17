import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

// MSW intercepts at the network layer so lib/api.ts and its Axios interceptors execute as
// written. Stubbing Axios directly would leave the auth-token interceptor untested.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  // Reset between tests so no test can depend on another's handlers or rendered DOM.
  // Order-dependence is a contract violation (FR-021).
  server.resetHandlers()
  cleanup()
  localStorage.clear()
})

afterAll(() => server.close())
