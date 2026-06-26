import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui'
import { getServerSession } from '@/lib/session'
import { userQueries } from '@/lib/user-db'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  const user = session ? await userQueries.findById(session.userId) : null

  return (
    <ToastProvider>
      {user ? (
        <AppShell user={{ firstName: user.first_name, email: user.email, plan: user.plan }}>
          {children}
        </AppShell>
      ) : (
        <AppShell>{children}</AppShell>
      )}
    </ToastProvider>
  )
}
