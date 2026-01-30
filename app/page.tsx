'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        router.replace('/capture')
      } else {
        router.replace('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      読み込み中...
    </div>
  )
}
