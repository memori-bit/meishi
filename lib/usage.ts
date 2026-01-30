import { prisma } from './prisma'
import { getTodayJST, jstKeyToDate } from './jst'

export interface UsageInfo {
  canUse: boolean
  remaining: number // -1の場合は無制限
  todayCount: number
  adBonusCount: number
  maxCount: number // -1の場合は無制限
  baseLimit: number
}

// 使用状況を取得
export async function getUsageStatus(userId: string): Promise<UsageInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userPlan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const plan = user.userPlan?.plan || 'FREE'

  // PRO/EXPOは無制限
  if (plan === 'PRO' || plan === 'EXPO') {
    return {
      canUse: true,
      remaining: -1, // 無制限
      todayCount: 0,
      adBonusCount: 0,
      maxCount: -1, // 無制限
      baseLimit: 0,
    }
  }

  // FREEプランの場合（JST基準の今日の日付を取得）
  const todayJST = getTodayJST()
  // Prismaのdate型は日付のみを扱うため、年月日だけを取得してDateオブジェクトを作成
  const todayDate = new Date(Date.UTC(todayJST.getFullYear(), todayJST.getMonth(), todayJST.getDate()))

  const usageDaily = await prisma.usageDaily.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayDate,
      },
    },
  })

  const baseLimit = 10
  const adBonusCount = Math.min(usageDaily?.adBonusCount || 0, 3) // 1日最大3回
  const adBonus = adBonusCount * 5 // 1回あたり+5回
  const maxCount = baseLimit + adBonus
  const todayCount = usageDaily?.count || 0
  const remaining = Math.max(0, maxCount - todayCount)

  return {
    canUse: remaining > 0,
    remaining,
    todayCount,
    adBonusCount,
    maxCount,
    baseLimit,
  }
}

// 使用回数を消費（原子的更新、競合に強い）
export async function consumeUsage(userId: string): Promise<{
  success: boolean
  remaining: number
  error?: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userPlan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const plan = user.userPlan?.plan || 'FREE'

  // PRO/EXPOは記録不要（常に成功）
  if (plan === 'PRO' || plan === 'EXPO') {
    return {
      success: true,
      remaining: -1, // 無制限
    }
  }

  // FREEプランの場合、残回数をチェックしてから原子的に更新
  const status = await getUsageStatus(userId)

  if (!status.canUse) {
    return {
      success: false,
      remaining: 0,
      error: 'Usage limit reached',
    }
  }

  const todayJSTKey = getTodayJST().toISOString().split('T')[0]
  const todayDate = jstKeyToDate(todayJSTKey)

  // 原子的に更新（upsert + increment）
  // トランザクション内で再度チェックしてから更新
  const result = await prisma.$transaction(async (tx) => {
    // 再度残回数をチェック
    const current = await tx.usageDaily.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayDate,
        },
      },
    })

    const currentCount = current?.count || 0
    const adBonusCount = Math.min(current?.adBonusCount || 0, 3)
    const maxCount = 10 + adBonusCount * 5

    // 上限チェック
    if (currentCount >= maxCount) {
      throw new Error('Usage limit reached')
    }

    // 原子的にインクリメント
    const updated = await tx.usageDaily.upsert({
      where: {
        userId_date: {
          userId,
          date: todayDate,
        },
      },
      update: {
        count: {
          increment: 1,
        },
      },
      create: {
        userId,
        date: todayDate,
        count: 1,
        adBonusCount: 0,
      },
    })

    const newCount = updated.count
    const newRemaining = Math.max(0, maxCount - newCount)

    return {
      success: true,
      remaining: newRemaining,
    }
  }).catch((error) => {
    // トランザクションエラー（主に上限到達）
    return {
      success: false,
      remaining: 0,
      error: error.message || 'Usage limit reached',
    }
  })

  return result
}

// 広告視聴ボーナスを付与（原子的更新、競合に強い）
export async function grantAdBonus(userId: string): Promise<{
  success: boolean
  remaining: number
  adBonusCount: number
  message: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userPlan: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const plan = user.userPlan?.plan || 'FREE'

  // PRO/EXPOは不要
  if (plan === 'PRO' || plan === 'EXPO') {
    return {
      success: false,
      remaining: -1,
      adBonusCount: 0,
      message: 'Not available for PRO/EXPO users',
    }
  }

  const todayJSTKey = getTodayJST().toISOString().split('T')[0]
  const todayDate = jstKeyToDate(todayJSTKey)

  // トランザクション内で原子的に更新
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.usageDaily.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayDate,
        },
      },
    })

    const currentAdBonusCount = current?.adBonusCount || 0

    // 1日最大3回
    if (currentAdBonusCount >= 3) {
      throw new Error('Daily ad watch limit reached (max 3 times per day)')
    }

    // 原子的にインクリメント
    const updated = await tx.usageDaily.upsert({
      where: {
        userId_date: {
          userId,
          date: todayDate,
        },
      },
      update: {
        adBonusCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        date: todayDate,
        count: 0,
        adBonusCount: 1,
      },
    })

    // 更新後の使用状況を計算
    const adBonusCount = updated.adBonusCount
    const count = updated.count
    const maxCount = 10 + adBonusCount * 5
    const remaining = Math.max(0, maxCount - count)

    return {
      success: true,
      remaining,
      adBonusCount,
      message: 'Ad watch recorded. +5 uses added.',
    }
  }).catch((error) => {
    return {
      success: false,
      remaining: 0,
      adBonusCount: 0,
      message: error.message || 'Failed to record ad watch',
    }
  })

  return result
}

// 後方互換性のため（既存コード用）
export async function getUsageInfo(userId: string): Promise<UsageInfo> {
  return getUsageStatus(userId)
}

export async function incrementUsage(userId: string): Promise<void> {
  const result = await consumeUsage(userId)
  if (!result.success) {
    throw new Error(result.error || 'Failed to increment usage')
  }
}

export async function recordAdWatch(userId: string): Promise<{
  success: boolean
  message: string
}> {
  const result = await grantAdBonus(userId)
  return {
    success: result.success,
    message: result.message,
  }
}
