'use client'

import { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons'

interface WidgetCardProps {
  title: string
  icon?: ReactNode
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
  className?: string
}

export default function WidgetCard({
  title,
  icon,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = '未公開',
  children,
  className = '',
}: WidgetCardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon && <div className="text-gray-600">{icon}</div>}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <FontAwesomeIcon icon={faSpinner} spin className="mr-2 text-blue-600" />
          <span className="text-gray-600">取得中...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-8 text-red-600">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && empty && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
          <span>{emptyMessage}</span>
        </div>
      )}

      {!loading && !error && !empty && <div>{children}</div>}
    </div>
  )
}
