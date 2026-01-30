'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/capture')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      読み込み中...
    </div>
  )
}
