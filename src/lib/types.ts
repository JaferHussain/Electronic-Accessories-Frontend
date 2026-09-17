export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errors: string[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LoginResult {
  token: string
  expiresAt: string
  userId: number
  username: string
  fullName: string | null
  role: 'Admin' | 'Salesman'
}

export interface Lookup {
  id: number
  name: string
  isActive: boolean
  productCount: number
}

export interface Supplier {
  id: number
  name: string
  phone: string | null
  address: string | null
  openingBalance: number
  isActive: boolean
}

export interface Product {
  id: number
  code: string
  barcode: string | null
  name: string
  brandId: number | null
  brandName: string | null
  categoryId: number | null
  categoryName: string | null
  model: string | null
  imagePath: string | null
  purchasePrice: number
  wholesalePrice: number
  retailPrice: number
  quantityInStock: number
  lowStockThreshold: number
  isActive: boolean
  totalPurchased: number
  totalSold: number
  profitPerUnit: number
  isLowStock: boolean
}

export interface ProductSearchItem {
  id: number
  code: string
  barcode: string | null
  name: string
  model: string | null
  brandName: string | null
  categoryName: string | null
  imagePath: string | null
  purchasePrice: number
  wholesalePrice: number
  retailPrice: number
  quantityInStock: number
  lowStockThreshold: number
}

export interface PurchaseListItem {
  id: number
  invoiceNo: string
  purchaseDate: string
  supplierId: number | null
  supplierName: string | null
  subTotal: number
  discount: number
  totalAmount: number
  paidAmount: number
  balance: number
  itemCount: number
  totalQuantity: number
  isVoided: boolean
  createdByName: string | null
  createdAt: string
}

export interface PurchaseItemDetail {
  id: number
  productId: number
  productName: string
  productCode: string
  model: string | null
  quantity: number
  unitCost: number
  lineTotal: number
}

export interface PurchaseDetail extends PurchaseListItem {
  notes: string | null
  items: PurchaseItemDetail[]
}

export type SaleType = 1 | 2
export type PaymentMethod = 1 | 2 | 3

export interface SaleListItem {
  id: number
  invoiceNo: string
  saleDate: string
  customerName: string | null
  customerPhone: string | null
  saleType: SaleType
  subTotal: number
  discount: number
  totalAmount: number
  totalCost: number
  totalProfit: number
  paymentMethod: PaymentMethod
  itemCount: number
  totalQuantity: number
  isVoided: boolean
  createdByName: string | null
  createdAt: string
}

export interface SaleItemDetail {
  id: number
  productId: number
  productName: string
  productCode: string
  model: string | null
  quantity: number
  unitPrice: number
  unitCost: number
  lineTotal: number
  lineProfit: number
}

export interface SaleDetail extends SaleListItem {
  items: SaleItemDetail[]
}

export interface Receipt {
  shopName: string
  shopAddress: string
  shopPhone: string
  footerText: string
  paperWidthMm: number
  invoiceNo: string
  saleDate: string
  createdAt: string
  customerName: string | null
  customerPhone: string | null
  saleType: SaleType
  paymentMethod: PaymentMethod
  salesmanName: string | null
  isVoided: boolean
  lines: { name: string; model: string | null; quantity: number; unitPrice: number; lineTotal: number }[]
  subTotal: number
  discount: number
  totalAmount: number
  totalQuantity: number
}

export interface DashboardSummary {
  totalProducts: number
  totalStockQty: number
  stockValueAtCost: number
  todayPurchaseAmount: number
  todaySaleAmount: number
  todayProfit: number
  monthSaleAmount: number
  monthProfit: number
  lowStockCount: number
}

export interface LowStockItem {
  id: number
  code: string
  name: string
  model: string | null
  brandName: string | null
  imagePath: string | null
  quantityInStock: number
  lowStockThreshold: number
}

export interface RecentSale {
  id: number
  invoiceNo: string
  saleDate: string
  createdAt: string
  customerName: string | null
  totalQuantity: number
  totalAmount: number
  totalProfit: number
}

export interface SalesChartPoint {
  date: string
  saleAmount: number
  profit: number
  invoiceCount: number
}

export interface ReportResult<TRow> {
  title: string
  from: string | null
  to: string | null
  summary: Record<string, number>
  rows: TRow[]
}

export interface User {
  id: number
  username: string
  fullName: string | null
  role: 'Admin' | 'Salesman'
  isActive: boolean
  createdAt: string
}
