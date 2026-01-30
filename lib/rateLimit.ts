// 簡易レート制限（メモリベース）
// 将来Upstash Redisなどに置換しやすいように抽象化

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 定期的に期限切れエントリを削除（1分ごと）
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  // レート制限チェック（ユーザーID単位）
  // maxRequests: 最大リクエスト数
  // windowSeconds: 時間窓（秒）
  check(
    userId: string,
    maxRequests: number = 10,
    windowSeconds: number = 60
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const resetAt = now + windowSeconds * 1000
    const key = userId

    const entry = this.store.get(key)

    // エントリが存在しない、または期限切れの場合は新規作成
    if (!entry || now >= entry.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt,
      })
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      }
    }

    // カウントが上限を超えている場合
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    // カウントをインクリメント
    entry.count++
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }

  // 期限切れエントリを削除
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  // ストアをクリア（テスト用）
  clear(): void {
    this.store.clear()
  }
}

// シングルトンインスタンス
export const rateLimiter = new RateLimiter()

// レート制限ミドルウェア（簡易版）
export function checkRateLimit(
  userId: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetAt: number } {
  return rateLimiter.check(userId, maxRequests, windowSeconds)
}

