import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWorkspaceContextFromRequest } from '@/lib/workspace'

type RouteContext = {
  params: Promise<{ id: string }>
}

/** メンバーの有効期限を更新（オーナーのみ） */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペースのメンバーを編集する権限がありません' },
        { status: 403 }
      )
    }
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const expiresAtStr = body.expiresAt as string | null | undefined

    const member = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
    })
    if (!member) {
      return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 })
    }

    let expiresAt: Date | null = null
    if (expiresAtStr !== undefined && expiresAtStr !== null) {
      if (expiresAtStr === '') {
        expiresAt = null
      } else {
        const d = new Date(expiresAtStr)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: '有効期限の形式が不正です' }, { status: 400 })
        }
        expiresAt = d
      }
    }

    const updated = await prisma.workspaceMember.update({
      where: { id },
      data: { expiresAt },
    })
    return NextResponse.json({
      id: updated.id,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('Workspace member update error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

/** メンバーを削除（オーナーのみ） */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペースのメンバーを削除する権限がありません' },
        { status: 403 }
      )
    }
    const { id } = await context.params
    const member = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
    })
    if (!member) {
      return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 })
    }
    await prisma.workspaceMember.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Workspace member delete error:', error)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
