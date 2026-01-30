'use client'

import { useEffect, useMemo, useState } from 'react'

/** リード（CRM用）・型はこのファイル内で定義（Cloud Build で types/ が含まれない場合の対策） */
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost'
type Lead = {
  id: string
  companyName: string
  personName: string
  email?: string | null
  phone?: string | null
  website?: string | null
  status: LeadStatus
  memo?: string | null
  createdAt?: string
}

const statusOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: '新規' },
  { value: 'contacted', label: '連絡済み' },
  { value: 'qualified', label: '見込み' },
  { value: 'lost', label: '失注' },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    companyName: '',
    personName: '',
    email: '',
    phone: '',
    website: '',
    status: 'new' as LeadStatus,
    memo: '',
  })

  const statusLabelMap = useMemo(() => {
    return statusOptions.reduce<Record<string, string>>((acc, item) => {
      acc[item.value] = item.label
      return acc
    }, {})
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/leads', { method: 'GET' })
      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (err) {
      console.error(err)
      setError('リード一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const handleCreate = async () => {
    if (!form.companyName.trim()) {
      setError('会社名は必須です')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        throw new Error('Failed to create lead')
      }
      const data = await response.json()
      setLeads((prev) => [data.lead, ...prev])
      setForm({
        companyName: '',
        personName: '',
        email: '',
        phone: '',
        website: '',
        status: 'new',
        memo: '',
      })
    } catch (err) {
      console.error(err)
      setError('リードの登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error('Failed to update lead')
      }
      const data = await response.json()
      setLeads((prev) => prev.map((lead) => (lead.id === id ? data.lead : lead)))
    } catch (err) {
      console.error(err)
      setError('ステータス更新に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このリードを削除しますか？')) return
    try {
      const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete lead')
      }
      setLeads((prev) => prev.filter((lead) => lead.id !== id))
    } catch (err) {
      console.error(err)
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">リード管理</h1>
          <p className="text-sm text-gray-600">名刺・問い合わせのリードを登録して管理します。</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規リード登録</h2>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">会社名 *</label>
              <input
                value={form.companyName}
                onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: 株式会社VideoStep"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">担当者名</label>
              <input
                value={form.personName}
                onChange={(event) => setForm({ ...form, personName: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: 山田 太郎"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">メール</label>
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="example@company.jp"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">電話番号</label>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="03-1234-5678"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Webサイト</label>
              <input
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">ステータス</label>
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as LeadStatus })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">メモ</label>
              <textarea
                value={form.memo}
                onChange={(event) => setForm({ ...form, memo: event.target.value })}
                className="mt-1 min-h-[80px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="商談状況や次アクションなど"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? '保存中...' : 'リードを登録'}
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">リード一覧</h2>
            <button
              type="button"
              onClick={loadLeads}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              更新
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-gray-500">リードがまだ登録されていません。</p>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-md border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{lead.companyName}</p>
                      <p className="text-sm text-gray-600">
                        {lead.personName || '担当者未登録'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={lead.status}
                        onChange={(event) =>
                          handleStatusChange(lead.id, event.target.value as LeadStatus)
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(lead.id)}
                        className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <span>メール: {lead.email || '未登録'}</span>
                    <span>電話: {lead.phone || '未登録'}</span>
                    <span>Web: {lead.website || '未登録'}</span>
                    <span>ステータス: {statusLabelMap[lead.status] || lead.status}</span>
                  </div>
                  {lead.memo && (
                    <p className="mt-2 text-sm text-gray-700">メモ: {lead.memo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
