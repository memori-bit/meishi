'use client'

import { useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faImage } from '@fortawesome/free-solid-svg-icons'

interface BusinessCardUploaderWidgetProps {
  onFrontSelected: (imageFile: File) => void
  onBackSelected: (imageFile: File) => void
  frontSelected: boolean
  backSelected: boolean
}

export default function BusinessCardUploaderWidget({
  onFrontSelected,
  onBackSelected,
  frontSelected,
  backSelected,
}: BusinessCardUploaderWidgetProps) {
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    console.log('handleFileChange called', e.target.files)
    const file = e.target.files?.[0]
    if (!file) {
      console.warn('No file selected')
      return
    }

    console.log('File selected:', file.name, file.type, file.size)

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('画像サイズが大きすぎます（最大10MB）')
      return
    }

    console.log('Calling onImageSelected with file:', file.name, side)
    if (side === 'front') {
      onFrontSelected(file)
      if (frontInputRef.current) {
        frontInputRef.current.value = ''
      }
    } else {
      onBackSelected(file)
      if (backInputRef.current) {
        backInputRef.current.value = ''
      }
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, side: 'front' | 'back') => {
    e.stopPropagation()
    const inputRef = side === 'front' ? frontInputRef.current : backInputRef.current
    console.log('handleClick called, inputRef:', inputRef)
    if (inputRef) {
      inputRef.click()
      console.log('File input clicked')
    } else {
      console.error('inputRef is null')
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" style={{ position: 'relative', zIndex: 1 }}>
      <h3 className="mb-3 text-lg font-semibold text-gray-900">名刺撮影（表・裏）</h3>

      <input
        ref={frontInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'front')}
        className="hidden"
      />
      <input
        ref={backInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'back')}
        className="hidden"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={(e) => handleClick(e, 'front')}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
          <FontAwesomeIcon icon={faCamera} className="mb-2 text-3xl text-gray-400" />
          <span className="text-gray-700">表を撮影</span>
          <span className={`mt-1 text-xs ${frontSelected ? 'text-green-600' : 'text-gray-500'}`}>
            {frontSelected ? '撮影済み' : '未撮影'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => handleClick(e, 'back')}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
          <FontAwesomeIcon icon={faImage} className="mb-2 text-3xl text-gray-400" />
          <span className="text-gray-700">裏を撮影（任意）</span>
          <span className={`mt-1 text-xs ${backSelected ? 'text-green-600' : 'text-gray-500'}`}>
            {backSelected ? '撮影済み' : '未撮影'}
          </span>
        </button>
      </div>
    </div>
  )
}
