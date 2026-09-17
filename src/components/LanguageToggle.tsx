import { Languages } from 'lucide-react'
import { useI18n } from '../i18n'
import { cx } from '../lib/format'

/**
 * Two-state language switch. Each option is always shown in its own script, so it is
 * readable no matter which language is currently active.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      className={cx('flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-0.5', className)}
      role="group"
      aria-label={t('common.language')}
    >
      <Languages className="mx-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <button
        type="button"
        onClick={() => setLang('ur')}
        aria-pressed={lang === 'ur'}
        className={cx(
          'rounded px-2 py-1 text-xs transition-colors',
          lang === 'ur' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        اردو
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={cx(
          'latin rounded px-2 py-1 text-xs transition-colors',
          lang === 'en' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        English
      </button>
    </div>
  )
}
