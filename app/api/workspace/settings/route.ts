import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getWorkspaceContextFromRequest,
  getMaxMembers,
  ensureWorkspaceSettings,
} from '@/lib/workspace'

const DEFAULT_MAX_MEMBERS = 5
const MIN_MAX_MEMBERS = 1
const MAX_MAX_MEMBERS = 50

/** ワークスペース設定（メンバー上限）の取得（オーナーのみ） */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペース設定を表示する権限がありません' },
        { status: 403 }
      )
    }
    const maxMembers = await getMaxMembers(ctx.workspaceId)
    return NextResponse.json({ maxMembers })
  } catch (error) {
    console.error('Workspace settings get error:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

/** ワークスペース設定（メンバー上限）の更新（オーナーのみ） */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペース設定を変更する権限がありません' },
        { status: 403 }
      )
    }
    const body = await request.json().catch(() => ({}))
    let maxMembers = typeof body.maxMembers === 'number' ? body.maxMembers : undefined
    if (maxMembers === undefined && typeof body.maxMembers === 'string') {
      const n = parseInt(body.maxMembers, 10)
      if (!Number.isNaN(n)) maxMembers = n
    }
    if (maxMembers === undefined) {
      return NextResponse.json({ error: 'maxMembers を指定してください' }, { status: 400 })
    }
    if (maxMembers < MIN_MAX_MEMBERS || maxMembers > MAX_MAX_MEMBERS) {
      return NextResponse.json(
        { error: `maxMembers は ${MIN_MAX_MEMBERS} 以上 ${MAX_MAX_MEMBERS} 以下にしてください` },
        { status: 400 }
      )
    }

    await ensureWorkspaceSettings(ctx.workspaceId)
    const current = await prisma.workspaceMember.count({
      where: { workspaceId: ctx.workspaceId },
    })
    if (maxMembers < current) {
      return NextResponse.json(
        { error: `現在のメンバー数（${current}人）を下回る値には設定できません` },
        { status: 400 }
      )
    }

    await prisma.workspaceSettings.upsert({
      where: { workspaceId: ctx.workspaceId },
      create: { workspaceId: ctx.workspaceId, maxMembers },
      update: { maxMembers },
    })
    return NextResponse.json({ maxMembers })
  } catch (error) {
    console.error('Workspace settings update error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
