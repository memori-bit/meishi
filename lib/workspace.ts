import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyIdToken } from '@/lib/firebaseAdmin'

const DEFAULT_MAX_MEMBERS = 5

export type WorkspaceRole = 'owner' | 'member'

export type WorkspaceContext = {
  workspaceId: string
  role: WorkspaceRole
  /** メンバーは名刺の削除・ワークスペース招待不可 */
  canDeleteLeads: boolean
  canManageWorkspace: boolean
}

/** オーナーとしてのコンテキスト（ワークスペース未導入 or 自分がオーナー） */
function ownerContext(uid: string): WorkspaceContext {
  return {
    workspaceId: uid,
    role: 'owner',
    canDeleteLeads: true,
    canManageWorkspace: true,
  }
}

/**
 * トークンから取得した uid と email で、有効なワークスペースと権限を返す。
 * - 自分がオーナー: workspaceId = uid, role = owner, 全権限
 * - 自分がメンバー（招待済み・未期限切れ）: workspaceId = オーナーの uid, role = member, 制限付き
 * - workspace_members テーブルが存在しない（マイグレーション未実施）場合はオーナー扱いでフォールバック
 */
export async function getWorkspaceContext(
  uid: string,
  email: string | null | undefined
): Promise<WorkspaceContext> {
  const now = new Date()

  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        AND: [
          {
            OR: [
              { memberUid: uid },
              ...(email ? [{ memberEmail: email, memberUid: null }] : []),
            ],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
    })

    if (membership) {
      if (!membership.memberUid && email) {
        await prisma.workspaceMember.update({
          where: { id: membership.id },
          data: { memberUid: uid },
        })
      }
      return {
        workspaceId: membership.workspaceId,
        role: 'member',
        canDeleteLeads: false,
        canManageWorkspace: false,
      }
    }
  } catch (err) {
    // テーブル未作成（マイグレーション未実施）やDB接続エラー時はオーナー扱い
    console.warn('Workspace context fallback to owner:', err instanceof Error ? err.message : err)
    return ownerContext(uid)
  }

  return ownerContext(uid)
}

export function isWorkspaceOwner(ctx: WorkspaceContext, uid: string): boolean {
  return ctx.workspaceId === uid
}

function assertWorkspaceModels(): void {
  const p = prisma as { workspaceSettings?: unknown; workspaceMember?: unknown }
  const hasSettings = p.workspaceSettings != null && typeof p.workspaceSettings === 'object'
  const hasMember = p.workspaceMember != null && typeof p.workspaceMember === 'object'
  if (!hasSettings || !hasMember) {
    throw new Error(
      'ワークスペース用のPrismaモデルが読み込まれていません。' +
      ' ターミナルで: 1) npx prisma generate  2) rm -rf .next  3) 開発サーバーを止めてから npm run dev で再起動'
    )
  }
}

export async function getMaxMembers(workspaceId: string): Promise<number> {
  assertWorkspaceModels()
  const settings = await prisma.workspaceSettings!.findUnique({
    where: { workspaceId },
  })
  return settings?.maxMembers ?? DEFAULT_MAX_MEMBERS
}

export async function getCurrentMemberCount(workspaceId: string): Promise<number> {
  assertWorkspaceModels()
  return prisma.workspaceMember!.count({
    where: { workspaceId },
  })
}

export async function ensureWorkspaceSettings(workspaceId: string): Promise<void> {
  assertWorkspaceModels()
  await prisma.workspaceSettings!.upsert({
    where: { workspaceId },
    create: { workspaceId, maxMembers: DEFAULT_MAX_MEMBERS },
    update: {},
  })
}

/** リクエストの Bearer トークンからワークスペースコンテキストを取得。未認証なら null */
export async function getWorkspaceContextFromRequest(
  request: NextRequest
): Promise<WorkspaceContext | null> {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null
  try {
    const decoded = await verifyIdToken(token)
    const uid = decoded.uid || ''
    const email = (decoded as { email?: string }).email ?? null
    if (!uid) return null
    return getWorkspaceContext(uid, email)
  } catch {
    return null
  }
}
