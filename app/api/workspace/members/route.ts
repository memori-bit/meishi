import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getWorkspaceContextFromRequest,
  getMaxMembers,
  getCurrentMemberCount,
  ensureWorkspaceSettings,
} from '@/lib/workspace'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペースのメンバー一覧を表示する権限がありません' },
        { status: 403 }
      )
    }
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'asc' },
    })
    const maxMembers = await getMaxMembers(ctx.workspaceId)
    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        memberEmail: m.memberEmail,
        memberUid: m.memberUid,
        role: m.role,
        expiresAt: m.expiresAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      maxMembers,
    })
  } catch (error) {
    console.error('Workspace members list error:', error)
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペースへの招待はオーナーのみ行えます' },
        { status: 403 }
      )
    }
    const body = await request.json().catch(() => ({}))
    const email = (body.email ?? '').toString().trim().toLowerCase()
    const expiresAtStr = body.expiresAt as string | null | undefined

    if (!email) {
      return NextResponse.json({ error: 'email は必須です' }, { status: 400 })
    }

    await ensureWorkspaceSettings(ctx.workspaceId)
    const current = await getCurrentMemberCount(ctx.workspaceId)
    const maxMembers = await getMaxMembers(ctx.workspaceId)
    if (current >= maxMembers) {
      return NextResponse.json(
        { error: `メンバー数の上限（${maxMembers}人）に達しています` },
        { status: 400 }
      )
    }

    let expiresAt: Date | null = null
    if (expiresAtStr) {
      const d = new Date(expiresAtStr)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: '有効期限の形式が不正です' }, { status: 400 })
      }
      expiresAt = d
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_memberEmail: {
          workspaceId: ctx.workspaceId,
          memberEmail: email,
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に招待済みです' },
        { status: 400 }
      )
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: ctx.workspaceId,
        memberEmail: email,
        role: 'member',
        expiresAt,
      },
    })
    return NextResponse.json({
      id: member.id,
      memberEmail: member.memberEmail,
      expiresAt: member.expiresAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Workspace invite error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to invite member'
    const isTableMissing =
      typeof message === 'string' &&
      (message.includes('does not exist') || message.includes('Unknown table'))
    return NextResponse.json(
      {
        error: isTableMissing
          ? 'ワークスペース用のテーブルが存在しません。マイグレーションを実行してください。（npx prisma migrate deploy）'
          : message,
      },
      { status: 500 }
    )
  }
}
