import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWorkspaceContextFromRequest } from '@/lib/workspace'
import type { CustomFieldValuePayload } from '@/types/customFields'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getWorkspaceContextFromRequest(_request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaceId = ctx.workspaceId
    const { id } = await context.params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        customFieldValues: {
          include: { field: true },
        },
      },
    })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    if (!lead.workspaceId || lead.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const customFields = lead.customFieldValues.map((item) => {
      let options: string[] | undefined
      if (item.field.options) {
        try {
          const parsed = JSON.parse(item.field.options) as unknown
          options = Array.isArray(parsed) ? parsed : undefined
        } catch {
          options = undefined
        }
      }
      return {
        id: item.field.id,
        label: item.field.label,
        type: item.field.type,
        value: item.value,
        options,
      }
    })
    const { customFieldValues, ...leadData } = lead
    return NextResponse.json({
      lead: {
        ...leadData,
        customFields,
      },
    })
  } catch (error) {
    console.error('Failed to fetch lead:', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

type UpdateLeadBody = {
  companyName?: string
  personName?: string
  department?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  postalCode?: string | null
  address?: string | null
  website?: string | null
  rawTextFront?: string | null
  rawTextBack?: string | null
  custom_fields?: CustomFieldValuePayload[]
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaceId = ctx.workspaceId
    const { id } = await context.params
    const existing = await prisma.lead.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    if (existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as UpdateLeadBody
    const companyName = body.companyName?.trim()
    const personName = body.personName?.trim()
    if (companyName !== undefined && !companyName) {
      return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
    }
    if (personName !== undefined && !personName) {
      return NextResponse.json({ error: 'person_name is required' }, { status: 400 })
    }

    await prisma.lead.update({
      where: { id },
      data: {
        ...(body.companyName !== undefined && { companyName: body.companyName.trim() }),
        ...(body.personName !== undefined && { personName: body.personName.trim() }),
        ...(body.department !== undefined && { department: body.department?.trim() || null }),
        ...(body.title !== undefined && { title: body.title?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.mobile !== undefined && { mobile: body.mobile?.trim() || null }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode?.trim() || null }),
        ...(body.address !== undefined && { address: body.address?.trim() || null }),
        ...(body.website !== undefined && { website: body.website?.trim() || null }),
        ...(body.rawTextFront !== undefined && { rawTextFront: body.rawTextFront?.trim() || null }),
        ...(body.rawTextBack !== undefined && { rawTextBack: body.rawTextBack?.trim() || null }),
      },
    })

    if (body.custom_fields !== undefined) {
      await prisma.leadCustomFieldValue.deleteMany({ where: { leadId: id } })
      if (body.custom_fields.length > 0) {
        await prisma.leadCustomFieldValue.createMany({
          data: body.custom_fields.map((item) => ({
            leadId: id,
            fieldId: item.fieldId,
            value: Array.isArray(item.value) ? JSON.stringify(item.value) : item.value,
          })),
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.canDeleteLeads) {
      return NextResponse.json(
        { error: 'ワークスペースメンバーは名刺の削除ができません' },
        { status: 403 }
      )
    }
    const workspaceId = ctx.workspaceId
    const { id } = await context.params
    const existing = await prisma.lead.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    if (existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await prisma.lead.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Failed to delete lead:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
