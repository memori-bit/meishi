'use client'

import { useEffect, useState } from 'react'
import { firebaseAuth } from '@/lib/firebase'

export type WorkspaceRoleState = {
  role: 'owner' | 'member'
  canDeleteLeads: boolean
  canManageWorkspace: boolean
  loading: boolean
}

export function useWorkspaceRole(): WorkspaceRoleState {
  const [state, setState] = useState<WorkspaceRoleState>({
    role: 'owner',
    canDeleteLeads: true,
    canManageWorkspace: true,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) {
        if (!cancelled) setState({ role: 'owner', canDeleteLeads: true, canManageWorkspace: true, loading: false })
        return
      }
      try {
        const res = await fetch('/api/workspace/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!cancelled && res.ok) {
          const data = await res.json()
          setState({
            role: data.role ?? 'owner',
            canDeleteLeads: data.canDeleteLeads ?? true,
            canManageWorkspace: data.canManageWorkspace ?? true,
            loading: false,
          })
        } else if (!cancelled) {
          setState({ role: 'owner', canDeleteLeads: true, canManageWorkspace: true, loading: false })
        }
      } catch {
        if (!cancelled) setState({ role: 'owner', canDeleteLeads: true, canManageWorkspace: true, loading: false })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
