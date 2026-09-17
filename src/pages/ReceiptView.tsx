import { Printer } from 'lucide-react'
import { money, displayDateTime, paymentLabel, saleTypeLabel } from '../lib/format'
import { useT } from '../i18n'
import type { Receipt } from '../lib/types'

/**
 * Thermal-printer layout. The width switches between 58 mm and 80 mm rolls;
 * only #receipt-print is visible when the browser prints (see index.css).
 */
export function ReceiptView({ receipt, onNew }: { receipt: Receipt; onNew?: () => void }) {
  const t = useT()
  const widthMm = receipt.paperWidthMm === 58 ? 58 : 80

  return (
    <div className="space-y-4">
      <div
        id="receipt-print"
        className="mx-auto bg-white p-3 text-slate-900"
        style={{ width: `${widthMm}mm`, maxWidth: '100%' }}
      >
        <div className="text-center">
          <p className="text-base font-semibold leading-snug">{receipt.shopName}</p>
          <p className="text-xs leading-snug">{receipt.shopAddress}</p>
          {receipt.shopPhone && <p className="latin text-xs">{receipt.shopPhone}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <div className="flex justify-between text-xs">
          <span>{t('sale.invoiceNo')}</span>
          <span className="latin">{receipt.invoiceNo}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>{t('common.date')}</span>
          <span className="latin">{displayDateTime(receipt.createdAt)}</span>
        </div>
        {receipt.customerName && (
          <div className="flex justify-between text-xs">
            <span>{t('sale.customer')}</span>
            <span>{receipt.customerName}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span>{t('sale.type')}</span>
          <span>
            {saleTypeLabel(t, receipt.saleType)} / {paymentLabel(t, receipt.paymentMethod)}
          </span>
        </div>

        {receipt.isVoided && (
          <p className="my-2 border border-red-500 py-1 text-center text-sm text-red-600">{t('receipt.voidedNotice')}</p>
        )}

        <div className="my-2 border-t border-dashed border-slate-400" />

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="py-1 text-start">{t('receipt.item')}</th>
              <th className="py-1 text-center">{t('receipt.qty')}</th>
              <th className="py-1 text-end">{t('receipt.rate')}</th>
              <th className="py-1 text-end">{t('receipt.total')}</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((line, index) => (
              <tr key={index} className="align-top">
                <td className="latin py-1 pe-1 leading-tight">
                  {line.name}
                  {line.model && <span className="block text-[10px] text-slate-500">{line.model}</span>}
                </td>
                <td className="latin py-1 text-center">{line.quantity}</td>
                <td className="latin py-1 text-end">{line.unitPrice.toFixed(0)}</td>
                <td className="latin py-1 text-end">{line.lineTotal.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <div className="space-y-0.5 text-xs">
          <Row label={t('receipt.totalItems')} value={String(receipt.totalQuantity)} />
          <Row label={t('sale.subtotal')} value={money(receipt.subTotal)} />
          {receipt.discount > 0 && <Row label={t('sale.discount')} value={`- ${money(receipt.discount)}`} />}
          <div className="flex justify-between border-t border-slate-400 pt-1 text-sm font-semibold">
            <span>{t('sale.grandTotal')}</span>
            <span className="latin">{money(receipt.totalAmount)}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />
        <p className="text-center text-xs">{receipt.footerText}</p>
        {receipt.salesmanName && <p className="text-center text-[10px] text-slate-500">{receipt.salesmanName}</p>}
      </div>

      <div className="no-print flex justify-center gap-2">
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t('receipt.print')}
        </button>
        {onNew && (
          <button className="btn-ghost" onClick={onNew}>
            {t('sale.newSale')}
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="latin">{value}</span>
    </div>
  )
}
