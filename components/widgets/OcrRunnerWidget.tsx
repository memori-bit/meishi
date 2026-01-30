'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { OcrCandidates } from '@/types/ocr'

interface OcrRunnerWidgetProps {
  frontImageFile: File | null
  backImageFile: File | null
  onOcrComplete: (candidates: OcrCandidates) => void
}

export default function OcrRunnerWidget({
  frontImageFile,
  backImageFile,
  onOcrComplete,
}: OcrRunnerWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<OcrCandidates | null>(null)
  const [editableCandidates, setEditableCandidates] = useState<OcrCandidates | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runOCR = async () => {
    if (!frontImageFile) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('frontImage', frontImageFile)
      if (backImageFile) {
        formData.append('backImage', backImageFile)
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('OCR API error:', errorData)
        throw new Error(errorData.error || errorData.message || `OCR failed with status ${response.status}`)
      }

      const data: OcrCandidates = await response.json()
      setCandidates(data)
      setEditableCandidates(data)
      setError(null)
    } catch (error) {
      console.error('OCR error:', error)
      const errorMessage = error instanceof Error ? error.message : 'OCR処理中にエラーが発生しました'
      setError(errorMessage)
      setCandidates(null)
      setEditableCandidates(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: keyof OcrCandidates, value: string) => {
    if (!editableCandidates) return
    const updated = { ...editableCandidates, [field]: value }
    setEditableCandidates(updated)
  }

  const handleConfirm = () => {
    if (!editableCandidates) {
      alert('OCR結果がありません')
      return
    }

    // 必須項目のチェック
    if (!editableCandidates.companyNameCandidate || editableCandidates.companyNameCandidate.trim() === '') {
      alert('会社名を入力してください')
      return
    }

    // 修正された内容を親に通知
    onOcrComplete(editableCandidates)
  }

  const handleReset = () => {
    if (candidates) {
      setEditableCandidates(candidates)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <FontAwesomeIcon icon={faSpinner} spin className="mr-2 text-blue-600" />
          <span className="text-gray-600">名刺を読み取っています…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-red-900">OCRエラー</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => frontImageFile && runOCR()}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!frontImageFile) {
    return null
  }

  if (!candidates) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm text-gray-700">
            裏面は任意です。必要に応じて追加してください。
          </div>
          <button
            type="button"
            onClick={runOCR}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            OCRを開始
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">OCR結果</h3>

      <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
        <p>OCR結果を確認し、必要に応じて修正してください。</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editableCandidates?.companyNameCandidate || ''}
            onChange={(e) => handleFieldChange('companyNameCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="会社名を入力"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">氏名</label>
          <input
            type="text"
            value={editableCandidates?.personNameCandidate || ''}
            onChange={(e) => handleFieldChange('personNameCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">役職</label>
          <input
            type="text"
            value={editableCandidates?.titleCandidate || ''}
            onChange={(e) => handleFieldChange('titleCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={editableCandidates?.urlCandidate || ''}
            onChange={(e) => handleFieldChange('urlCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com"
          />
          <p className="mt-1 text-xs text-gray-500">公式サイトのURLを入力してください</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            value={editableCandidates?.emailCandidate || ''}
            onChange={(e) => handleFieldChange('emailCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="example@company.com"
          />
          <p className="mt-1 text-xs text-gray-500">連絡先として保存されます</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">郵便番号</label>
          <input
            type="text"
            value={editableCandidates?.postalCodeCandidate || ''}
            onChange={(e) => handleFieldChange('postalCodeCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="123-4567"
          />
          <p className="mt-1 text-xs text-gray-500">連絡先として保存されます</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">住所</label>
          <input
            type="text"
            value={editableCandidates?.addressCandidate || ''}
            onChange={(e) => handleFieldChange('addressCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="東京都..."
          />
          <p className="mt-1 text-xs text-gray-500">連絡先として保存されます</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">電話番号（補助）</label>
          <input
            type="text"
            value={editableCandidates?.phoneCandidate || ''}
            onChange={(e) => handleFieldChange('phoneCandidate', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            disabled
          />
          <p className="mt-1 text-xs text-gray-500">補助用途のみ（編集不可）</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {candidates && JSON.stringify(candidates) !== JSON.stringify(editableCandidates) && (
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            リセット
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!editableCandidates?.companyNameCandidate?.trim()}
        >
          この内容で確定
        </button>
      </div>
    </div>
  )
}
