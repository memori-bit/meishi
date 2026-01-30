'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BusinessCardUploaderWidget from '@/components/widgets/BusinessCardUploaderWidget'
import MobileNav from '@/components/MobileNav'
import AuthGate from '@/components/AuthGate'
import type { OcrFields, OcrResponse } from '@/types/ocr'
import type { CustomField, CustomFieldValuePayload } from '@/types/customFields'
import { firebaseAuth } from '@/lib/firebase'

const emptyFields: OcrFields = {
  company_name: '',
  person_name: '',
  department: '',
  title: '',
  email: '',
  phone: '',
  mobile: '',
  postal_code: '',
  address: '',
  website: '',
}

export default function CapturePage() {
  const router = useRouter()
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null)
  const [backImageFile, setBackImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null)
  const [fields, setFields] = useState<OcrFields>(emptyFields)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customValues, setCustomValues] = useState<Record<string, string | string[]>>({})
  const [customFieldError, setCustomFieldError] = useState<string | null>(null)

  const handleFrontImageSelected = (file: File) => {
    setFrontImageFile(file)
    setOcrResult(null)
    setFields(emptyFields)
    setError(null)
    setSaveMessage(null)
    setCustomValues({})
  }

  const handleBackImageSelected = (file: File) => {
    setBackImageFile(file)
    setOcrResult(null)
    setFields(emptyFields)
    setError(null)
    setSaveMessage(null)
    setCustomValues({})
  }

  const handleRunOcr = async () => {
    if (!frontImageFile) {
      setError('表の画像を選択してください')
      return
    }
    setLoading(true)
    setError(null)
    setSaveMessage(null)
    setCustomValues({})
    try {
      const formData = new FormData()
      formData.append('front_image', frontImageFile)
      if (backImageFile) {
        formData.append('back_image', backImageFile)
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'OCRに失敗しました' }))
        throw new Error(errorData.error || errorData.message || 'OCRに失敗しました')
      }

      const data: OcrResponse = await response.json()
      setOcrResult(data)
      setFields(data.fields || emptyFields)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCRに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomFields = async () => {
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const response = await fetch('/api/custom-fields', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('アンケート項目の取得に失敗しました')
      }
      const data = await response.json()
      setCustomFields(data.fields || [])
    } catch (err) {
      setCustomFieldError(err instanceof Error ? err.message : 'アンケート項目の取得に失敗しました')
    }
  }

  useEffect(() => {
    fetchCustomFields()
  }, [])

  const handleCustomValueChange = (fieldId: string, value: string | string[]) => {
    setCustomValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const renderCustomInput = (field: CustomField) => {
    const value = customValues[field.id]
    const options = field.options || []

    if (field.type === 'text') {
      return (
        <input
          value={(value as string) || ''}
          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
        />
      )
    }

    if (field.type === 'select') {
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">選択してください</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'radio') {
      return (
        <div className="flex flex-wrap gap-3">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`custom-${field.id}`}
                checked={value === option}
                onChange={() => handleCustomValueChange(field.id, option)}
              />
              {option}
            </label>
          ))}
        </div>
      )
    }

    if (field.type === 'checkbox') {
      const selected = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-wrap gap-3">
          {options.map((option) => {
            const isChecked = selected.includes(option)
            return (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option)
                    handleCustomValueChange(field.id, updated)
                  }}
                />
                {option}
              </label>
            )
          })}
        </div>
      )
    }

    return null
  }

  const handleFieldChange = (key: keyof OcrFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveMessage(null)

    if (!fields.company_name.trim() || !fields.person_name.trim()) {
      setSaveError('会社名と氏名は必須です')
      return
    }

    setSaving(true)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('認証情報が取得できません')
      }
      const customPayload: CustomFieldValuePayload[] = customFields.map((field) => ({
        fieldId: field.id,
        value:
          customValues[field.id] === undefined
            ? field.type === 'checkbox'
              ? []
              : ''
            : customValues[field.id],
      }))

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fields,
          raw_text_front: ocrResult?.raw_text_front || '',
          raw_text_back: ocrResult?.raw_text_back || '',
          custom_fields: customPayload,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '保存に失敗しました' }))
        throw new Error(errorData.error || '保存に失敗しました')
      }

      setSaveMessage('保存しました')
      setTimeout(() => {
        router.push('/history')
      }, 400)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    const confirmDiscard = confirm('今回のOCR結果を破棄しますか？')
    if (!confirmDiscard) return
    setOcrResult(null)
    setFields(emptyFields)
    setSaveError(null)
    setSaveMessage(null)
    setCustomValues({})
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-24">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">名刺OCR</h1>

        <BusinessCardUploaderWidget
          onFrontSelected={handleFrontImageSelected}
          onBackSelected={handleBackImageSelected}
          frontSelected={!!frontImageFile}
          backSelected={!!backImageFile}
        />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              表は必須、裏は任意です。OCRを実行してください。
            </div>
            <button
              type="button"
              onClick={handleRunOcr}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
              disabled={loading}
            >
              {loading ? 'OCR中...' : 'OCR実行'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {ocrResult && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              OCR結果の一覧（編集可）
            </h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <input
                  value={fields.company_name}
                  onChange={(e) => handleFieldChange('company_name', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <input
                  value={fields.person_name}
                  onChange={(e) => handleFieldChange('person_name', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">部署</label>
                <input
                  value={fields.department}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">役職</label>
                <input
                  value={fields.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">メール</label>
                <input
                  type="email"
                  value={fields.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">電話</label>
                <input
                  value={fields.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">携帯</label>
                <input
                  value={fields.mobile}
                  onChange={(e) => handleFieldChange('mobile', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">Webサイト</label>
                <input
                  value={fields.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">郵便番号</label>
                <input
                  value={fields.postal_code}
                  onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="font-medium">住所</label>
                <input
                  value={fields.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            {customFields.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="mb-3 text-base font-semibold text-gray-900">アンケート項目</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <label className="font-medium">{field.label}</label>
                      <div className="w-full max-w-md">{renderCustomInput(field)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customFieldError && <p className="mt-3 text-sm text-red-600">{customFieldError}</p>}
            {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
            {saveMessage && <p className="mt-3 text-sm text-green-600">{saveMessage}</p>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleDiscard}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50 sm:w-auto"
              >
                保存しない
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-md bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
        </div>
        <MobileNav />
      </div>
    </AuthGate>
  )
}
