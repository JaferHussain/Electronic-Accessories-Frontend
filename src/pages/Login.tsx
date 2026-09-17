import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Store, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { errorMessage } from '../lib/api'
import { LanguageToggle } from '../components/LanguageToggle'

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function Login() {
  const { login } = useAuth()
  const t = useT()
  const [busy, setBusy] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  async function onSubmit(values: FormValues) {
    setBusy(true)
    try {
      await login(values.username, values.password)
      toast.success(t('auth.login'))
    } catch (error) {
      toast.error(errorMessage(error, t('auth.loginFailed')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex justify-center">
          <LanguageToggle />
        </div>

        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Store className="h-10 w-10 text-brand-500" />
          <h1 className="text-xl">{t('shop.name')}</h1>
          <p className="text-sm text-slate-500">{t('shop.address')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">{t('auth.username')}</label>
            <input {...register('username')} className="field latin" autoFocus autoComplete="username" />
            {errors.username && <p className="mt-1 text-xs text-red-600">{t('auth.enterUsername')}</p>}
          </div>

          <div>
            <label className="label">{t('auth.password')}</label>
            <input {...register('password')} type="password" className="field latin" autoComplete="current-password" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{t('auth.enterPassword')}</p>}
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            <LogIn className="h-4 w-4" />
            {busy ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  )
}
