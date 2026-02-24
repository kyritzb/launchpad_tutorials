'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { TutorialNav } from '@/components/tutorial-nav'
import { CodeBlock } from '@/components/code-block'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

const roleCode = `-- The profiles table has a "role" column: 'user' | 'admin'
-- To make someone an admin, run this in the SQL editor:
update public.profiles
set role = 'admin'
where id = '<the user uuid>';`

const adminPolicyCode = `-- Admins can read ALL profiles
create policy "admins_read_all_profiles"
  on public.profiles
  for select
  using (
    -- Look up the calling user's own profile to check their role
    exists (
      select 1 from public.profiles admin_check
      where admin_check.id = auth.uid()
        and admin_check.role = 'admin'
    )
  );

-- Combined policies now mean:
-- 'user' role  → sees self + friends only
-- 'admin' role → sees EVERYONE (all 3 policies can match)

-- Note: multiple SELECT policies are OR'd together in Postgres`

const keyColorsCode = `-- The "avatar_color" column acts as a visual key tier
-- 🔵 blue   → regular user
-- 🟢 green  → verified / trusted user
-- 🟣 purple → moderator
-- 👑 gold   → admin

-- You could drive RLS from color instead of role:
create policy "gold_key_sees_all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.avatar_color = 'gold'
    )
  );`

const promoteCode = `// Promote a user to admin (must be called from service role key
// or a Supabase Edge Function — not from the browser!)
const { error } = await supabase
  .from('profiles')
  .update({ role: 'admin' })
  .eq('id', targetUserId)

// In the browser, regular users cannot update role because
// the update policy uses: with check (auth.uid() = id)
// and doesn't allow changing sensitive fields.`

export default function RlsAdminPage() {
  const [signedIn] = useState(false)

  const keyTiers = [
    { color: 'bg-blue-500', label: 'Blue Key', role: 'user', access: 'Own profile + friends', border: 'border-blue-500/40' },
    { color: 'bg-green-500', label: 'Green Key', role: 'verified', access: 'Own profile + friends + verified users', border: 'border-green-500/40' },
    { color: 'bg-purple-500', label: 'Purple Key', role: 'moderator', access: 'Own profile + friends + all public profiles', border: 'border-purple-500/40' },
    { color: 'bg-yellow-500', label: 'Gold Key', role: 'admin', access: 'ALL profiles — no restrictions', border: 'border-yellow-500/40' },
  ]

  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👑</span>
            <h1 className="text-3xl font-bold">RLS: Admin Access</h1>
          </div>
          <p className="text-muted-foreground">
            The third layer: a privileged role that can see everything. Since Postgres RLS policies
            are <strong>OR&apos;d together</strong>, adding an admin policy doesn&apos;t remove any existing
            access — it just adds a new way to satisfy the check.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Key Color Access Tiers</h2>
          <p className="text-sm text-muted-foreground">
            Think of each role as a key color. Higher tiers unlock more doors in the database.
          </p>
          <div className="grid gap-3">
            {keyTiers.map((tier) => (
              <div key={tier.role} className={`flex items-center gap-4 p-3 rounded-lg border ${tier.border} bg-muted/10`}>
                <div className={`w-8 h-8 rounded-full ${tier.color} shrink-0 flex items-center justify-center`}>
                  <div className="w-3 h-3 bg-white/30 rounded-full" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tier.label}</span>
                    <Badge variant="outline" className="text-xs font-mono">{tier.role}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.access}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. The role column</h2>
          <CodeBlock code={roleCode} language="sql" label="SQL Editor" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Admin RLS policy</h2>
          <p className="text-sm text-muted-foreground">
            This policy uses a <em>self-join</em>: it queries the profiles table to check
            the calling user&apos;s own role. Because it runs with the user&apos;s JWT context,
            they can only ever see their own role row.
          </p>
          <CodeBlock code={adminPolicyCode} language="sql" label="Policy" highlight={[6, 7, 8, 9, 10, 11]} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Key colors → RLS (concept)</h2>
          <CodeBlock code={keyColorsCode} language="sql" label="avatar_color as access key" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Promoting a user (server-side only)</h2>
          <Alert>
            <AlertDescription className="text-xs">
              Role changes should happen server-side (Edge Function, SQL editor, or service-role key).
              Never expose your service role key to the browser.
            </AlertDescription>
          </Alert>
          <CodeBlock code={promoteCode} language="typescript" label="Edge Function / Server" />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How multiple policies combine</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 text-xs font-medium">Policy evaluation (all for SELECT)</div>
            <div className="divide-y divide-border">
              {[
                { policy: 'read_own_profile', check: 'auth.uid() = id', result: 'true for own row' },
                { policy: 'friends_can_read_profile', check: 'EXISTS(friendships...)', result: 'true for friends' },
                { policy: 'admins_read_all_profiles', check: 'EXISTS(role = admin)', result: 'true for all rows if admin' },
              ].map((row) => (
                <div key={row.policy} className="grid grid-cols-3 px-4 py-3 text-xs gap-2">
                  <span className="font-mono text-blue-300">{row.policy}</span>
                  <span className="font-mono text-yellow-300">{row.check}</span>
                  <span className="text-muted-foreground">{row.result}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t border-border">
              A row is visible if <strong className="text-foreground">ANY</strong> of the above policies returns true for it.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
