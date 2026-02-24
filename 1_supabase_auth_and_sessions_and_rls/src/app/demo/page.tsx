'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import { TutorialNav } from '@/components/tutorial-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'

type Role = 'user' | 'admin'
type AvatarColor = 'blue' | 'green' | 'purple' | 'gold'

interface UserAccount {
  id: string
  email: string
  accessToken: string
  username: string
  role: Role
  avatarColor: AvatarColor
}

interface Profile {
  id: string
  username: string
  role: string
  avatar_color: string
}

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  gold: 'bg-yellow-500',
}

const colorBorder: Record<string, string> = {
  blue: 'border-blue-500/40',
  green: 'border-green-500/40',
  purple: 'border-purple-500/40',
  gold: 'border-yellow-500/40',
}

function KeyDot({ color }: { color: string }) {
  return (
    <div className={`w-4 h-4 rounded-full ${colorClasses[color] ?? 'bg-zinc-500'} inline-block`} />
  )
}

function UserCard({
  account,
  onFetchProfiles,
  visibleProfiles,
  loading,
}: {
  account: UserAccount
  onFetchProfiles: (user: UserAccount) => void
  visibleProfiles: Profile[] | null
  loading: boolean
}) {
  return (
    <Card className={`border ${colorBorder[account.avatarColor]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <KeyDot color={account.avatarColor} />
          <CardTitle className="text-sm">{account.username}</CardTitle>
          <Badge variant="outline" className="text-xs ml-auto">{account.role}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{account.email}</p>
        <p className="text-xs text-muted-foreground font-mono">{account.id.slice(0, 16)}…</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => onFetchProfiles(account)}
          disabled={loading}
        >
          {loading ? 'Fetching…' : 'Fetch visible profiles'}
        </Button>

        {visibleProfiles !== null && (
          <div className="border border-border rounded overflow-hidden">
            <div className="px-2 py-1 bg-muted/30 text-xs font-medium">
              {visibleProfiles.length} profile{visibleProfiles.length !== 1 ? 's' : ''} visible
            </div>
            {visibleProfiles.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground italic">No rows returned (RLS blocked all)</p>
            ) : (
              visibleProfiles.map((p) => (
                <div key={p.id} className="px-2 py-1.5 border-t border-border flex items-center gap-2 text-xs">
                  <KeyDot color={p.avatar_color} />
                  <span className="font-medium">{p.username}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{p.role}</Badge>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DemoPage() {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [profileResults, setProfileResults] = useState<Record<string, Profile[] | null>>({})
  const [loadingFor, setLoadingFor] = useState<string | null>(null)

  // Sign up form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [color, setColor] = useState<AvatarColor>('blue')
  const [signUpError, setSignUpError] = useState('')
  const [signUpLoading, setSignUpLoading] = useState(false)

  // Friends form
  const [friendA, setFriendA] = useState('')
  const [friendB, setFriendB] = useState('')
  const [friendMsg, setFriendMsg] = useState('')

  const supabase = createClient()

  const signUp = async () => {
    setSignUpError('')
    setSignUpLoading(true)
    try {
      const username = email.split('@')[0]
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      })
      if (error) throw error
      if (!data.session) {
        setSignUpError('Check your email to confirm (or disable email confirmation in Supabase settings).')
        setSignUpLoading(false)
        return
      }

      // Update avatar_color
      const { createClient: raw } = await import('@supabase/supabase-js')
      const client = raw(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } } }
      )
      await client.from('profiles').update({ avatar_color: color }).eq('id', data.session.user.id)

      setAccounts(prev => [...prev, {
        id: data.session!.user.id,
        email,
        accessToken: data.session!.access_token,
        username,
        role: 'user',
        avatarColor: color,
      }])
      setEmail('')
      setPassword('')
    } catch (e: unknown) {
      setSignUpError(e instanceof Error ? e.message : String(e))
    } finally {
      setSignUpLoading(false)
    }
  }

  const fetchProfiles = useCallback(async (account: UserAccount) => {
    setLoadingFor(account.id)
    try {
      const { createClient: raw } = await import('@supabase/supabase-js')
      const client = raw(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${account.accessToken}` } } }
      )
      const { data } = await client.from('profiles').select('id, username, role, avatar_color')
      setProfileResults(prev => ({ ...prev, [account.id]: data ?? [] }))
    } finally {
      setLoadingFor(null)
    }
  }, [])

  const addFriendship = async () => {
    setFriendMsg('')
    const userA = accounts.find(a => a.id === friendA || a.username === friendA)
    const userB = accounts.find(a => a.id === friendB || a.username === friendB)
    if (!userA || !userB) {
      setFriendMsg('Could not find both users. Use exact username or ID.')
      return
    }
    const { createClient: raw } = await import('@supabase/supabase-js')
    const client = raw(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${userA.accessToken}` } } }
    )
    const { error } = await client.from('friendships').insert({
      user_a_id: userA.id,
      user_b_id: userB.id,
    })
    if (error) setFriendMsg(`Error: ${error.message}`)
    else setFriendMsg(`Friendship created between ${userA.username} and ${userB.username}! Re-fetch profiles to see the change.`)
  }

  const colors: AvatarColor[] = ['blue', 'green', 'purple', 'gold']

  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-4xl space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h1 className="text-3xl font-bold">Live Demo</h1>
          </div>
          <p className="text-muted-foreground">
            Create multiple accounts with different key colors, fetch what each can see under RLS,
            add friendships, and compare access. This is the full system end-to-end.
          </p>
        </div>

        <Alert>
          <AlertDescription className="text-sm">
            Make sure you&apos;ve run all 3 SQL migrations and set your <code className="font-mono text-xs bg-muted px-1 rounded">.env.local</code> values.
            In Supabase settings, you may want to disable &quot;Email confirmations&quot; for quick testing.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="friends">Friendships</TabsTrigger>
            <TabsTrigger value="compare">Compare Access</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6 pt-4">
            <div className="border border-border rounded-lg p-4 space-y-4 max-w-sm">
              <h3 className="font-semibold text-sm">Create a new account</h3>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Key Color</Label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full ${colorClasses[c]} transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={signUp} disabled={signUpLoading || !email || !password} className="w-full">
                {signUpLoading ? 'Creating…' : 'Create Account'}
              </Button>
              {signUpError && <Alert variant="destructive"><AlertDescription className="text-xs">{signUpError}</AlertDescription></Alert>}
            </div>

            {accounts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3">Active accounts this session</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {accounts.map((acc) => (
                    <div key={acc.id} className={`p-3 rounded-lg border ${colorBorder[acc.avatarColor]} bg-muted/10`}>
                      <div className="flex items-center gap-2 mb-1">
                        <KeyDot color={acc.avatarColor} />
                        <span className="font-medium text-sm">{acc.username}</span>
                        <Badge variant="outline" className="text-xs ml-auto">{acc.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{acc.email}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{acc.id.slice(0, 20)}…</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Link two accounts as friends. After adding, re-fetch profiles on the Compare tab.
            </p>
            <div className="space-y-3 max-w-sm">
              <div className="space-y-1">
                <Label className="text-xs">User A (username or ID)</Label>
                <Input value={friendA} onChange={e => setFriendA(e.target.value)} className="h-8 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">User B (username or ID)</Label>
                <Input value={friendB} onChange={e => setFriendB(e.target.value)} className="h-8 text-sm font-mono" />
              </div>
              <Button size="sm" onClick={addFriendship}>Add Friendship</Button>
              {friendMsg && <p className="text-xs text-muted-foreground">{friendMsg}</p>}
            </div>

            {accounts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Quick-fill — click a username to paste into User A/B:</p>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => friendA ? setFriendB(acc.username) : setFriendA(acc.username)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border ${colorBorder[acc.avatarColor]} text-xs hover:bg-muted`}
                    >
                      <KeyDot color={acc.avatarColor} />
                      {acc.username}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="pt-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create accounts on the Accounts tab first.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((acc) => (
                  <UserCard
                    key={acc.id}
                    account={acc}
                    onFetchProfiles={fetchProfiles}
                    visibleProfiles={profileResults[acc.id] ?? null}
                    loading={loadingFor === acc.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
