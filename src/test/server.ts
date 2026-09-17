import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// One server for the whole run; handlers are reset between tests in setup.ts so no test
// can inherit another's stubs.
export const server = setupServer(...handlers)
