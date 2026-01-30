'use client'

import { useEffect, useState } from 'react'
import MobileNav from '@/components/MobileNav'
import AuthGate from '@/components/AuthGate'
import type { CustomField, CustomFieldType } from '@/types/customFields'
import { signOut } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'
import { useWorkspaceRole } from '@/lib/useWorkspaceRole'
import { toErrorMessage } from '@/lib/errorMessage'
import { useRouter } from 'next/navigation'

const TYPE_OPTIONS: Array<{ value: CustomFieldType; label: string }> = [
  { value: 'text', label: 'テキスト' },
  { value: 'radio', label: 'ラジオ' },
  { value: 'checkbox', label: 'チェック' },
  { value: 'select', label: 'プルダウン' },
]

type WorkspaceMemberRow = {
  id: string
  memberEmail: string
  memberUid: string | null
  role: string
  expiresAt: string | null
  createdAt: string
}

export default function SettingsPage() {
  const { canManageWorkspace, loading: roleLoading } = useWorkspaceRole()
  const [format, setFormat] = useState<'hubspot' | 'salesforce'>('hubspot')
  const [fields, setFields] = useState<CustomField[]>([])
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [optionsText, setOptionsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberRow[]>([])
  const [maxMembers, setMaxMembers] = useState(5)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteExpiresAt, setInviteExpiresAt] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [maxMembersInput, setMaxMembersInput] = useState('')
  const [maxMembersLoading, setMaxMembersLoading] = useState(false)

  const loadFields = async () => {
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const response = await fetch('/api/custom-fields', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('項目の取得に失敗しました')
      }
      const data = await response.json()
      setFields(data.fields || [])
    } catch (err) {
      setError(toErrorMessage(err, '項目の取得に失敗しました'))
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  const loadWorkspace = async () => {
    if (!canManageWorkspace) return
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) return
      const [membersRes, settingsRes] = await Promise.all([
        fetch('/api/workspace/members', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workspace/settings', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (membersRes.ok) {
        const data = await membersRes.json()
        setWorkspaceMembers(data.members || [])
        const max = data.maxMembers ?? 5
        setMaxMembers(max)
        setMaxMembersInput(String(max))
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        const max = data.maxMembers ?? 5
        setMaxMembers(max)
        setMaxMembersInput(String(max))
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (canManageWorkspace && !roleLoading) loadWorkspace()
  }, [canManageWorkspace, roleLoading])

  const handleInvite = async () => {
    setWorkspaceError(null)
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      setWorkspaceError('メールアドレスを入力してください')
      return
    }
    setInviteLoading(true)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) throw new Error('認証情報が取得できません')
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          expiresAt: inviteExpiresAt || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '招待に失敗しました')
      setInviteEmail('')
      setInviteExpiresAt('')
      await loadWorkspace()
    } catch (err) {
      setWorkspaceError(toErrorMessage(err, '招待に失敗しました'))
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemoveMember = async (id: string) => {
    if (!confirm('このメンバーを削除しますか？')) return
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch(`/api/workspace/members/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('削除に失敗しました')
      await loadWorkspace()
    } catch (err) {
      setWorkspaceError(toErrorMessage(err, '削除に失敗しました'))
    }
  }

  const handleUpdateMaxMembers = async () => {
    const n = parseInt(maxMembersInput, 10)
    if (Number.isNaN(n) || n < 1 || n > 50) {
      setWorkspaceError('メンバー数は1〜50の範囲で入力してください')
      return
    }
    setMaxMembersLoading(true)
    setWorkspaceError(null)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maxMembers: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '更新に失敗しました')
      setMaxMembers(n)
    } catch (err) {
      setWorkspaceError(toErrorMessage(err, '更新に失敗しました'))
    } finally {
      setMaxMembersLoading(false)
    }
  }

  const handleAddField = async () => {
    setError(null)
    if (!label.trim()) {
      setError('項目名を入力してください')
      return
    }
    const options =
      type === 'text'
        ? []
        : optionsText
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)

    if (type !== 'text' && options.length === 0) {
      setError('選択肢をカンマ区切りで入力してください')
      return
    }

    setLoading(true)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label, type, options }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: '追加に失敗しました' }))
        throw new Error(data.error || '追加に失敗しました')
      }
      setLabel('')
      setOptionsText('')
      await loadFields()
    } catch (err) {
      setError(toErrorMessage(err, '追加に失敗しました'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm('この項目を削除しますか？')
    if (!confirmDelete) return
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const response = await fetch('/api/custom-fields', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }
      await loadFields()
    } catch (err) {
      setError(toErrorMessage(err, '削除に失敗しました'))
    }
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-24">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">インポートフォーマット</h2>
            <div className="flex gap-6 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-format"
                  value="hubspot"
                  checked={format === 'hubspot'}
                  onChange={() => setFormat('hubspot')}
                />
                HubSpot
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-format"
                  value="salesforce"
                  checked={format === 'salesforce'}
                  onChange={() => setFormat('salesforce')}
                />
                Salesforce
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">アンケート項目設定</h2>
          {canManageWorkspace && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">項目名</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: 興味のあるサービス"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">形式</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CustomFieldType)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {type !== 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">選択肢</label>
                  <input
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="例: 価格, 機能, 導入支援"
                  />
                  <p className="mt-1 text-xs text-gray-500">カンマ区切りで入力</p>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={handleAddField}
                disabled={loading}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '追加中...' : '項目を追加'}
              </button>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">登録済み項目</h3>
            {fields.length === 0 && (
              <p className="text-sm text-gray-500">まだ項目がありません</p>
            )}
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-gray-800">{field.label}</div>
                  <div className="text-xs text-gray-500">
                    {TYPE_OPTIONS.find((opt) => opt.value === field.type)?.label}
                    {field.options && field.options.length > 0
                      ? ` (${field.options.join(', ')})`
                      : ''}
                  </div>
                </div>
                {canManageWorkspace && (
                  <button
                    type="button"
                    onClick={() => handleDelete(field.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
          </div>

          {canManageWorkspace ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">ワークスペース</h2>
            <p className="mb-4 text-sm text-gray-600">
              同じ会社のメンバーを招待すると、名刺の登録・編集・履歴の確認が可能になります。メンバーは名刺の削除や招待はできません。
            </p>

            <div className="mb-4 rounded-md border border-gray-200 p-3">
              <h3 className="mb-2 text-sm font-medium text-gray-800">メンバー数の上限</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxMembersInput || maxMembers}
                  onChange={(e) => setMaxMembersInput(e.target.value)}
                  className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <span className="text-sm text-gray-600">人</span>
                <button
                  type="button"
                  onClick={handleUpdateMaxMembers}
                  disabled={maxMembersLoading}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 disabled:opacity-50"
                >
                  {maxMembersLoading ? '更新中...' : '更新'}
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-md border border-gray-200 p-3">
              <h3 className="mb-2 text-sm font-medium text-gray-800">メンバーを招待</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500">メールアドレス</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="mt-0.5 block w-full min-w-0 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <label className="block text-xs text-gray-500">有効期限（任意）</label>
                    <input
                      type="date"
                      value={inviteExpiresAt}
                      onChange={(e) => setInviteExpiresAt(e.target.value)}
                      className="mt-0.5 rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviteLoading}
                    className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviteLoading ? '招待中...' : '招待する'}
                  </button>
                </div>
              </div>
              {workspaceError && <p className="mt-2 text-sm text-red-600">{workspaceError}</p>}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-800">招待済みメンバー（{workspaceMembers.length} / {maxMembers}）</h3>
              {workspaceMembers.length === 0 && (
                <p className="text-sm text-gray-500">まだメンバーがいません</p>
              )}
              <ul className="space-y-2">
                {workspaceMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-800">{m.memberEmail}</span>
                      {m.memberUid ? (
                        <span className="ml-2 text-xs text-green-600">ログイン済み</span>
                      ) : (
                        <span className="ml-2 text-xs text-gray-500">未ログイン</span>
                      )}
                      {m.expiresAt && (
                        <span className="ml-2 text-xs text-gray-500">
                          期限: {new Date(m.expiresAt).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">ワークスペース</h2>
              <p className="text-sm text-gray-600">
                あなたはワークスペースのメンバーです。名刺の登録・編集・履歴の確認ができます。名刺の削除やワークスペースの招待はできません。
              </p>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={async () => {
                await signOut(firebaseAuth)
                router.replace('/login')
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50"
            >
              ログアウト
            </button>
          </div>
        </div>
        <MobileNav />
      </div>
    </AuthGate>
  )
}
