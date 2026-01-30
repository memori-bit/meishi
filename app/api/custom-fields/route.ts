import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWorkspaceContextFromRequest } from '@/lib/workspace'
import type { CustomFieldType } from '@/types/customFields'

function ensureCustomFieldClient() {
  const prismaAny = prisma as unknown as { customField?: unknown }
  return !!prismaAny.customField
}

export async function GET(request: NextRequest) {
  try {
    if (!ensureCustomFieldClient()) {
      return NextResponse.json(
        {
          error:
            'Prisma client is outdated. Run database migration and prisma generate.',
        },
        { status: 500 }
      )
    }
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaceId = ctx.workspaceId
    const fields = await prisma.customField.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      fields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        options: field.options ? JSON.parse(field.options) : null,
        createdAt: field.createdAt,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch custom fields:', error)
    return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!ensureCustomFieldClient()) {
      return NextResponse.json(
        {
          error:
            'Prisma client is outdated. Run database migration and prisma generate.',
        },
        { status: 500 }
      )
    }
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペースメンバーはカスタム項目の追加ができません' },
        { status: 403 }
      )
    }
    const workspaceId = ctx.workspaceId
    const body = await request.json()
    const label = (body.label || '').trim()
    const type = body.type as CustomFieldType
    const options = Array.isArray(body.options) ? body.options : []

    if (!label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 })
    }
    if (!['text', 'radio', 'checkbox', 'select'].includes(type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 })
    }

    const field = await prisma.customField.create({
      data: {
        workspaceId,
        label,
        type,
        options: options.length > 0 ? JSON.stringify(options) : null,
      },
    })

    return NextResponse.json({
      field: {
        id: field.id,
        label: field.label,
        type: field.type,
        options,
        createdAt: field.createdAt,
      },
    })
  } catch (error) {
    console.error('Failed to create custom field:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create custom field'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!ensureCustomFieldClient()) {
      return NextResponse.json(
        {
          error:
            'Prisma client is outdated. Run database migration and prisma generate.',
        },
        { status: 500 }
      )
    }
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canManageWorkspace) {
      return NextResponse.json(
        { error: 'ワークスペースメンバーはカスタム項目の削除ができません' },
        { status: 403 }
      )
    }
    const workspaceId = ctx.workspaceId
    const body = await request.json()
    const id = body.id as string
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const field = await prisma.customField.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!field) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await prisma.customField.delete({ where: { id: field.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete custom field:', error)
    return NextResponse.json({ error: 'Failed to delete custom field' }, { status: 500 })
  }
}
