'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import AuthGate from '@/components/AuthGate'
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'
import { useWorkspaceRole } from '@/lib/useWorkspaceRole'

type LeadListItem = {
  id: string
  companyName: string
  personName: string
  createdAt: string
}

function buildLeadsUrl(from?: string, to?: string): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const q = params.toString()
  return `/api/leads${q ? `?${q}` : ''}`
}

function buildExportUrl(from?: string, to?: string): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const q = params.toString()
  return `/api/leads/export${q ? `?${q}` : ''}`
}

export default function HistoryPage() {
  const router = useRouter()
  const { canDeleteLeads } = useWorkspaceRole()
  const [leads, setLeads] = useState<LeadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const url = buildLeadsUrl(dateFrom || undefined, dateTo || undefined)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('履歴の取得に失敗しました')
      }
      const data = await response.json()
      setLeads(data.leads || [])
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : '履歴の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleExport = async () => {
    setExportLoading(true)
    setError(null)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const url = buildExportUrl(dateFrom || undefined, dateTo || undefined)
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        throw new Error('エクスポートに失敗しました')
      }
      const blob = await res.blob()
      const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました')
    } finally {
      setExportLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)))
    }
  }

  const openDeleteModal = () => {
    if (selectedIds.size === 0 && leads.length === 0) return
    setDeleteModalOpen(true)
    setDeletePassword('')
    setDeleteError(null)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeletePassword('')
    setDeleteError(null)
  }

  const handleBulkDelete = async () => {
    const idsToDelete = selectedIds.size > 0 ? Array.from(selectedIds) : leads.map((l) => l.id)
    if (idsToDelete.length === 0) return
    if (!deletePassword.trim()) {
      setDeleteError('パスワードを入力してください')
      return
    }
    const user = firebaseAuth.currentUser
    if (!user?.email) {
      setDeleteError('ログイン情報を取得できません')
      return
    }
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword)
      await reauthenticateWithCredential(user, credential)
      const token = await user.getIdToken()
      const response = await fetch('/api/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadIds: idsToDelete }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '削除に失敗しました')
      }
      closeDeleteModal()
      await fetchLeads()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '削除に失敗しました。パスワードを確認してください。')
    } finally {
      setDeleteLoading(false)
    }
  }

  const selectedCount = selectedIds.size
  const canDeleteAll = leads.length > 0
  const deleteLabel =
    selectedCount > 0
      ? `選択した${selectedCount}件を削除`
      : '全件削除'

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-24">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900">履歴</h1>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push('/capture')}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                新規登録
              </button>
              <button
                onClick={handleExport}
                disabled={exportLoading || leads.length === 0}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {exportLoading ? 'エクスポート中...' : 'エクスポート'}
              </button>
              {canDeleteAll && canDeleteLeads && (
                <button
                  onClick={openDeleteModal}
                  className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  一括削除
                </button>
              )}
            </div>
          </div>

          {/* 期間絞り込み */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">期間で絞り込み</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">から</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">まで</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                クリア
              </button>
            </div>
          </div>

          {loading && <p className="text-gray-600">読み込み中...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && (
            <>
              <div className="space-y-3 md:hidden">
                {leads.length === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
                    まだ保存されたリードがありません。期間を変えるか、新規登録から追加してください。
                  </div>
                )}
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    {canDeleteLeads && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => router.push(`/history/${lead.id}`)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm text-gray-500">会社名</div>
                      <div className="text-base font-semibold text-gray-900">
                        {lead.companyName}
                      </div>
                      <div className="mt-2 text-sm text-gray-500">氏名</div>
                      <div className="text-sm text-gray-800">{lead.personName}</div>
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(lead.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10 px-2 py-3">
                        <input
                          type="checkbox"
                          checked={leads.length > 0 && selectedIds.size === leads.length}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">会社名</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">氏名</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">作成日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={canDeleteLeads ? 4 : 3}>
                          まだ保存されたリードがありません。期間を変えるか、新規登録から追加してください。
                        </td>
                      </tr>
                    )}
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/history/${lead.id}`)}
                      >
                        {canDeleteLeads && (
                          <td className="w-10 px-2 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(lead.id)}
                              onChange={() => toggleSelect(lead.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                        )}
                        <td className="px-4 py-4">{lead.companyName}</td>
                        <td className="px-4 py-4">{lead.personName}</td>
                        <td className="px-4 py-4">
                          {new Date(lead.createdAt).toLocaleString('ja-JP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <MobileNav />
      </div>

      {/* 一括削除確認ダイアログ */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">一括削除の確認</h3>
            <p className="mt-2 text-sm text-gray-600">
              {selectedCount > 0
                ? `選択した${selectedCount}件のリードを削除します。`
                : 'すべてのリードを削除します。'}
              この操作は取り消せません。実行するにはパスワードを入力してください。
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value)
                  setDeleteError(null)
                }}
                placeholder="アカウントのパスワード"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            {deleteError && (
              <p className="mt-2 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleteLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? '削除中...' : deleteLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  )
}
