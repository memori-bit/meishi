// JST（Asia/Tokyo）基準の日付キー生成

/**
 * JST基準の今日の日付を取得（Dateオブジェクト）
 */
export function getTodayJST(): Date {
  // JSTはUTC+9
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000 // 9時間をミリ秒に変換
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const jst = new Date(utc + jstOffset)
  
  // 時分秒を0にリセット
  jst.setHours(0, 0, 0, 0)
  
  return jst
}

/**
 * JST基準の今日の日付キーを取得（YYYY-MM-DD形式の文字列）
 */
export function getTodayJSTKey(): string {
  const today = getTodayJST()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * JST基準の日付キーをDateオブジェクトに変換（Prisma用）
 * PrismaのDate型は内部でUTCとして保存されるため、UTCで作成
 */
export function jstKeyToDate(jstKey: string): Date {
  const [year, month, day] = jstKey.split('-').map(Number)
  // JST 00:00:00 = UTC 15:00:00 (前日)
  // PrismaはUTCで保存するため、JSTの00:00:00をUTCで表現
  // ただし、Prismaのdate型は日付のみなので、時刻は無視される
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  return date
}

