'use client'

import { useState } from 'react'

interface SectionItem {
  label: string
  value: string
  sources: string[]
  confidence: 'high' | 'mid' | 'low'
}

interface SectionItemsProps {
  items: SectionItem[]
  emptyMessage?: string
}

export default function SectionItems({ items, emptyMessage = '情報なし' }: SectionItemsProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())

  const toggleSources = (index: number) => {
    const newExpanded = new Set(expandedSources)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSources(newExpanded)
  }

  if (!items || items.length === 0) {
    return <p className="text-gray-500 text-sm">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mr-1">•</span>
            <div className="flex-1">
              <div className="space-y-1">
                {item.label && (
                  <div className="font-bold text-gray-900 text-sm">{item.label}</div>
                )}
                {item.value && (
                  <div className="text-gray-700 text-sm leading-relaxed">{item.value}</div>
                )}
              </div>
              {item.sources && item.sources.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleSources(index)}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>出典</span>
                    <span className="text-xs">
                      {expandedSources.has(index) ? '▲' : '▼'}
                    </span>
                    <span className="text-gray-500">({item.sources.length})</span>
                  </button>
                  {expandedSources.has(index) && (
                    <div className="mt-2 pl-4 space-y-1">
                      {item.sources.map((source, sourceIndex) => (
                        <a
                          key={sourceIndex}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:text-blue-700 hover:underline break-all"
                        >
                          {source}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
