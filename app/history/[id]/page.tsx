'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import AuthGate from '@/components/AuthGate'
import { firebaseAuth } from '@/lib/firebase'
import { useWorkspaceRole } from '@/lib/useWorkspaceRole'

type CustomFieldItem = {
  id: string
  label: string
  type: string
  value?: string | null
  options?: string[]
}

type LeadDetail = {
  id: string
  companyName: string
  personName: string
  department?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  postalCode?: string | null
  address?: string | null
  website?: string | null
  rawTextFront?: string | null
  rawTextBack?: string | null
  customFields?: CustomFieldItem[]
  createdAt: string
}

function displayCustomValue(field: CustomFieldItem): string {
  if (!field.value) return '-'
  if (field.type === 'checkbox') {
    try {
      const parsed = JSON.parse(field.value)
      if (Array.isArray(parsed)) return parsed.join(', ')
    } catch {
      // noop
    }
  }
  return field.value
}

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { canDeleteLeads } = useWorkspaceRole()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 編集用のローカル状態（編集モード時のみ使用）
  const [editForm, setEditForm] = useState({
    companyName: '',
    personName: '',
    department: '',
    title: '',
    email: '',
    phone: '',
    mobile: '',
    postalCode: '',
    address: '',
    website: '',
    rawTextFront: '',
    rawTextBack: '',
    customValues: {} as Record<string, string | string[]>,
  })

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const response = await fetch(`/api/leads/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('詳細の取得に失敗しました')
      }
      const data = await response.json()
      setLead(data.lead)
      const l = data.lead as LeadDetail
      setEditForm({
        companyName: l.companyName || '',
        personName: l.personName || '',
        department: l.department || '',
        title: l.title || '',
        email: l.email || '',
        phone: l.phone || '',
        mobile: l.mobile || '',
        postalCode: l.postalCode || '',
        address: l.address || '',
        website: l.website || '',
        rawTextFront: l.rawTextFront || '',
        rawTextBack: l.rawTextBack || '',
        customValues: (l.customFields || []).reduce(
          (acc, f) => {
            if (f.type === 'checkbox' && f.value) {
              try {
                const parsed = JSON.parse(f.value)
                acc[f.id] = Array.isArray(parsed) ? parsed : [f.value]
              } catch {
                acc[f.id] = f.value
              }
            } else {
              acc[f.id] = f.value || ''
            }
            return acc
          },
          {} as Record<string, string | string[]>
        ),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '詳細の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  const startEdit = () => {
    if (lead) {
      setEditForm({
        companyName: lead.companyName || '',
        personName: lead.personName || '',
        department: lead.department || '',
        title: lead.title || '',
        email: lead.email || '',
        phone: lead.phone || '',
        mobile: lead.mobile || '',
        postalCode: lead.postalCode || '',
        address: lead.address || '',
        website: lead.website || '',
        rawTextFront: lead.rawTextFront || '',
        rawTextBack: lead.rawTextBack || '',
        customValues: (lead.customFields || []).reduce(
          (acc, f) => {
            if (f.type === 'checkbox' && f.value) {
              try {
                const parsed = JSON.parse(f.value)
                acc[f.id] = Array.isArray(parsed) ? parsed : [f.value]
              } catch {
                acc[f.id] = f.value
              }
            } else {
              acc[f.id] = f.value || ''
            }
            return acc
          },
          {} as Record<string, string | string[]>
        ),
      })
      setIsEditing(true)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!lead) return
    const companyName = editForm.companyName.trim()
    const personName = editForm.personName.trim()
    if (!companyName || !personName) {
      setError('会社名と氏名は必須です')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const custom_fields = (lead.customFields || []).map((f) => ({
        fieldId: f.id,
        value: editForm.customValues[f.id] ?? (f.value || ''),
      }))
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName,
          personName,
          department: editForm.department.trim() || null,
          title: editForm.title.trim() || null,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          mobile: editForm.mobile.trim() || null,
          postalCode: editForm.postalCode.trim() || null,
          address: editForm.address.trim() || null,
          website: editForm.website.trim() || null,
          rawTextFront: editForm.rawTextFront.trim() || null,
          rawTextBack: editForm.rawTextBack.trim() || null,
          custom_fields,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '保存に失敗しました')
      }
      setIsEditing(false)
      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!lead) return
    setDeleting(true)
    setError(null)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '削除に失敗しました')
      }
      setDeleteModalOpen(false)
      router.push('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const setCustomValue = (fieldId: string, value: string | string[]) => {
    setEditForm((prev) => ({
      ...prev,
      customValues: { ...prev.customValues, [fieldId]: value },
    }))
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-24">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900">履歴詳細</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/history')}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              {!loading && !error && lead && !isEditing && (
                <>
                  <button
                    onClick={startEdit}
                    className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    編集
                  </button>
                  {canDeleteLeads && (
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      削除
                    </button>
                  )}
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </>
              )}
            </div>
          </div>

          {loading && <p className="text-gray-600">読み込み中...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && lead && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 text-sm text-gray-700">
                <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                  OCR結果（構造化）
                </div>

                {!isEditing ? (
                  <>
                    <div>
                      <div className="text-xs text-gray-500">会社名</div>
                      <div className="font-medium">{lead.companyName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">氏名</div>
                      <div className="font-medium">{lead.personName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">部署</div>
                      <div>{lead.department || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">役職</div>
                      <div>{lead.title || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">メール</div>
                      <div>{lead.email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">電話</div>
                      <div>{lead.phone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">携帯</div>
                      <div>{lead.mobile || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Webサイト</div>
                      <div>{lead.website || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">郵便番号</div>
                      <div>{lead.postalCode || '-'}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">住所</div>
                      <div>{lead.address || '-'}</div>
                    </div>
                    {lead.customFields && lead.customFields.length > 0 && (
                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">アンケート項目</div>
                        <div className="mt-2 space-y-2 text-sm text-gray-700">
                          {lead.customFields.map((field) => (
                            <div
                              key={field.id}
                              className="flex items-start justify-between gap-4"
                            >
                              <div className="font-medium text-gray-700">{field.label}</div>
                              <div className="text-right text-gray-600">
                                {displayCustomValue(field)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                      OCR生テキスト
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">表</div>
                      <div className="whitespace-pre-wrap text-xs text-gray-600">
                        {lead.rawTextFront || '-'}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">裏</div>
                      <div className="whitespace-pre-wrap text-xs text-gray-600">
                        {lead.rawTextBack || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">作成日</div>
                      <div>{new Date(lead.createdAt).toLocaleString('ja-JP')}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500">会社名 *</label>
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, companyName: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">氏名 *</label>
                      <input
                        type="text"
                        value={editForm.personName}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, personName: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">部署</label>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, department: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">役職</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">メール</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">電話</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">携帯</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, mobile: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Webサイト</label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, website: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">郵便番号</label>
                      <input
                        type="text"
                        value={editForm.postalCode}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, postalCode: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500">住所</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, address: e.target.value }))
                        }
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    {(lead.customFields?.length ?? 0) > 0 && (
                      <div className="sm:col-span-2 space-y-2">
                        <div className="text-xs text-gray-500">アンケート項目</div>
                        {lead.customFields!.map((field) => {
                          const val = editForm.customValues[field.id]
                          const options = field.options ?? []
                          return (
                            <div key={field.id}>
                              <label className="block text-xs font-medium text-gray-700">
                                {field.label}
                              </label>
                              {field.type === 'text' && (
                                <input
                                  type="text"
                                  value={typeof val === 'string' ? val : ''}
                                  onChange={(e) => setCustomValue(field.id, e.target.value)}
                                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                />
                              )}
                              {(field.type === 'radio' || field.type === 'select') && (
                                <select
                                  value={typeof val === 'string' ? val : ''}
                                  onChange={(e) => setCustomValue(field.id, e.target.value)}
                                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                >
                                  <option value="">選択してください</option>
                                  {options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {field.type === 'checkbox' && (
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {options.map((opt) => {
                                    const arr = Array.isArray(val) ? val : []
                                    const checked = arr.includes(opt)
                                    return (
                                      <label key={opt} className="flex items-center gap-1 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => {
                                            const next = checked
                                              ? arr.filter((x) => x !== opt)
                                              : [...arr, opt]
                                            setCustomValue(field.id, next)
                                          }}
                                          className="rounded border-gray-300"
                                        />
                                        {opt}
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                      OCR生テキスト
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500">表</label>
                      <textarea
                        value={editForm.rawTextFront}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, rawTextFront: e.target.value }))
                        }
                        rows={4}
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500">裏</label>
                      <textarea
                        value={editForm.rawTextBack}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, rawTextBack: e.target.value }))
                        }
                        rows={4}
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">作成日</div>
                      <div>{new Date(lead.createdAt).toLocaleString('ja-JP')}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <MobileNav />
      </div>

      {/* 削除確認ダイアログ */}
      {deleteModalOpen && lead && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">削除の確認</h3>
            <p className="mt-2 text-sm text-gray-600">
              「{lead.companyName}」のリードを削除します。この操作は取り消せません。よろしいですか？
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  )
}
