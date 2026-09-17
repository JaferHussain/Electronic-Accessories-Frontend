import { http, HttpResponse } from 'msw'

/**
 * Baseline handlers. Individual tests override these with `server.use(...)` for the case
 * they are exercising — an override is local to that test because setup.ts resets handlers
 * afterwards.
 *
 * `onUnhandledRequest: 'error'` in setup.ts means any request without a handler fails the
 * test loudly rather than hanging or silently returning undefined.
 */

/** The API's standard envelope. Matches ApiResponse<T> in src/lib/types.ts. */
export function envelope<T>(data: T, message = '') {
  return { success: true, message, data, errors: [] as string[] }
}

export function errorEnvelope(message: string, errors: string[] = []) {
  return { success: false, message, data: null, errors }
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }

    if (body.username === 'owner' && body.password === 'ShopOwner1') {
      return HttpResponse.json(
        envelope({
          token: 'test-token',
          expiresAt: new Date(Date.now() + 12 * 3600_000).toISOString(),
          user: { id: 1, username: 'owner', fullName: 'محمد اسلم', role: 'Admin' },
        }),
      )
    }

    return HttpResponse.json(errorEnvelope('غلط صارف نام یا پاس ورڈ'), { status: 401 })
  }),

  http.get('/api/products', () =>
    HttpResponse.json(
      envelope({
        items: [
          {
            id: 1,
            name: 'موبائل چارجر',
            barcode: 'PRD-0001',
            retailPrice: 450,
            wholesalePrice: 400,
            purchasePrice: 320,
            quantityInStock: 12,
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    ),
  ),

  http.get('/api/dashboard', () =>
    HttpResponse.json(
      envelope({ todaySales: 0, todayProfit: 0, lowStockCount: 0, totalProducts: 1 }),
    ),
  ),
]
