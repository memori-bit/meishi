import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceContextFromRequest } from '@/lib/workspace'

/** 現在のユーザーのワークスペース役割と権限（UIで削除・招待を非表示するため） */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({
      role: ctx.role,
      canDeleteLeads: ctx.canDeleteLeads,
      canManageWorkspace: ctx.canManageWorkspace,
    })
  } catch (error) {
    console.error('Workspace me error:', error)
    return NextResponse.json({ error: 'Failed to get workspace info' }, { status: 500 })
  }
}
