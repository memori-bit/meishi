import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWorkspaceContextFromRequest } from '@/lib/workspace'
import type { OcrFields } from '@/types/ocr'
import type { CustomFieldValuePayload } from '@/types/customFields'

type CreateLeadRequest = {
  fields: OcrFields
  raw_text_front?: string
  raw_text_back?: string
  custom_fields?: CustomFieldValuePayload[]
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaceId = ctx.workspaceId
    const { searchParams } = new URL(request.url)
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')
    const where: { workspaceId: string; createdAt?: { gte?: Date; lte?: Date } } = {
      workspaceId,
    }
    if (fromStr || toStr) {
      where.createdAt = {}
      if (fromStr) {
        where.createdAt.gte = new Date(fromStr)
        where.createdAt.gte.setHours(0, 0, 0, 0)
      }
      if (toStr) {
        where.createdAt.lte = new Date(toStr)
        where.createdAt.lte.setHours(23, 59, 59, 999)
      }
    }
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaceId = ctx.workspaceId
    const body = (await request.json()) as CreateLeadRequest
    const fields = body.fields

    if (!fields?.company_name?.trim() || !fields?.person_name?.trim()) {
      return NextResponse.json(
        { error: 'company_name and person_name are required' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        companyName: fields.company_name.trim(),
        personName: fields.person_name.trim(),
        department: fields.department?.trim() || null,
        title: fields.title?.trim() || null,
        email: fields.email?.trim() || null,
        phone: fields.phone?.trim() || null,
        mobile: fields.mobile?.trim() || null,
        postalCode: fields.postal_code?.trim() || null,
        address: fields.address?.trim() || null,
        website: fields.website?.trim() || null,
        rawTextFront: body.raw_text_front?.trim() || null,
        rawTextBack: body.raw_text_back?.trim() || null,
      },
    })

    if (body.custom_fields && body.custom_fields.length > 0) {
      await prisma.leadCustomFieldValue.createMany({
        data: body.custom_fields.map((item) => ({
          leadId: lead.id,
          fieldId: item.fieldId,
          value: Array.isArray(item.value) ? JSON.stringify(item.value) : item.value,
        })),
      })
    }

    return NextResponse.json({ id: lead.id })
  } catch (error) {
    console.error('Failed to create lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}))
    const leadIds = body.leadIds as string[] | undefined
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      )
    }
    const result = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds },
        workspaceId,
      },
    })
    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Failed to delete leads:', error)
    return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 })
  }
}
