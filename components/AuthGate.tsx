'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'

const AUTH_PENDING_KEY = 'meishi_auth_pending'
const PERSISTENCE_CHECK_MS = 800
const AUTH_PENDING_WAIT_MS = 2500

function clearAuthPending() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(AUTH_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current)
          redirectTimeoutRef.current = null
        }
        clearAuthPending()
        setAuthorized(true)
        setChecking(false)
        return
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
      const isAuthPending = typeof window !== 'undefined' && sessionStorage.getItem(AUTH_PENDING_KEY) === '1'
      const delayMs = isAuthPending ? AUTH_PENDING_WAIT_MS : PERSISTENCE_CHECK_MS

      redirectTimeoutRef.current = setTimeout(async () => {
        redirectTimeoutRef.current = null
        let current = firebaseAuth.currentUser
        if (!current && delayMs >= AUTH_PENDING_WAIT_MS) {
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 200))
            current = firebaseAuth.currentUser
            if (current) break
          }
        }
        if (current) {
          clearAuthPending()
          setAuthorized(true)
        } else {
          clearAuthPending()
          setAuthorized(false)
          router.replace('/login')
        }
        setChecking(false)
      }, delayMs)
    })
    return () => {
      unsubscribe()
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        読み込み中...
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
