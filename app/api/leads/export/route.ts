import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWorkspaceContextFromRequest } from '@/lib/workspace'

function escapeCsvCell(value: string | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const DEPARTMENT_KEYWORDS = ['部', '課', '室', 'グループ', 'チーム', 'Division', 'Department']

/** 部署らしい文字列か（キーワードを含むか） */
function looksLikeDepartment(s: string | null | undefined): boolean {
  const t = (s ?? '').trim()
  if (!t) return false
  return DEPARTMENT_KEYWORDS.some((kw) => t.includes(kw))
}

/**
 * 氏名と部署から「姓」「名」「部署」を整える。
 * - personName にスペースがあればそこで分割して 姓・名 にする。
 * - スペースがなく、department が部署キーワードを含まない場合は
 *   OCRで姓/名が氏名・部署に分かれて保存されたとみなし、姓=personName, 名=department, 部署=空 にする。
 */
function normalizeNameAndDepartment(
  personName: string | null | undefined,
  department: string | null | undefined
): { familyName: string; givenName: string; department: string } {
  const nameStr = (personName ?? '').trim()
  const deptStr = (department ?? '').trim()

  if (!nameStr) {
    return { familyName: '', givenName: '', department: deptStr }
  }

  const firstSpace = nameStr.indexOf(' ')
  if (firstSpace !== -1) {
    return {
      familyName: nameStr.slice(0, firstSpace).trim(),
      givenName: nameStr.slice(firstSpace + 1).trim(),
      department: deptStr,
    }
  }

  if (deptStr && !looksLikeDepartment(deptStr)) {
    return {
      familyName: nameStr,
      givenName: deptStr,
      department: '',
    }
  }

  return {
    familyName: nameStr,
    givenName: '',
    department: deptStr,
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceContextFromRequest(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaceId = ctx.workspaceId

    const { searchParams } = new URL(request.url)
    const fromStr = searchParams.get('from') // YYYY-MM-DD
    const toStr = searchParams.get('to') // YYYY-MM-DD

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
      include: {
        customFieldValues: { include: { field: true } },
      },
    })

    const baseHeaders = [
      '会社名',
      '姓',
      '名',
      '部署',
      '役職',
      'メール',
      '電話',
      '携帯',
      '郵便番号',
      '住所',
      'Webサイト',
      '登録日',
    ]
    const customLabels = new Map<string, string>()
    for (const lead of leads) {
      for (const cv of lead.customFieldValues) {
        if (!customLabels.has(cv.field.id)) {
          customLabels.set(cv.field.id, cv.field.label)
        }
      }
    }
    const customIds = Array.from(customLabels.keys())
    const headerRow = [...baseHeaders, ...customIds.map((id) => customLabels.get(id) || id)]

    const rows: string[][] = [headerRow]
    for (const lead of leads) {
      const { familyName, givenName, department } = normalizeNameAndDepartment(
        lead.personName,
        lead.department
      )
      const customMap = new Map<string, string>()
      for (const cv of lead.customFieldValues) {
        let val = cv.value || ''
        if (cv.field.type === 'checkbox' && val) {
          try {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) val = parsed.join(', ')
          } catch {
            // keep as is
          }
        }
        customMap.set(cv.fieldId, val)
      }
      const row = [
        escapeCsvCell(lead.companyName),
        escapeCsvCell(familyName),
        escapeCsvCell(givenName),
        escapeCsvCell(department),
        escapeCsvCell(lead.title),
        escapeCsvCell(lead.email),
        escapeCsvCell(lead.phone),
        escapeCsvCell(lead.mobile),
        escapeCsvCell(lead.postalCode),
        escapeCsvCell(lead.address),
        escapeCsvCell(lead.website),
        escapeCsvCell(lead.createdAt ? new Date(lead.createdAt).toISOString() : ''),
        ...customIds.map((id) => escapeCsvCell(customMap.get(id))),
      ]
      rows.push(row)
    }

    const bom = '\uFEFF'
    const csv = bom + rows.map((r) => r.join(',')).join('\r\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export leads error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
