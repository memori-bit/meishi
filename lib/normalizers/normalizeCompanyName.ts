// 会社名の正規化（表記ゆれを統一、会社種別を除去）

export function normalizeCompanyName(name: string): string {
  if (!name) return ''

  let normalized = name.trim()

  // 全角・半角スペースを統一
  normalized = normalized.replace(/[\s\u3000]+/g, ' ')

  // 会社種別を除去（検索用にクリーンな名前を返す）
  normalized = normalized.replace(/（株）|㈱|株式会社/g, '')
  normalized = normalized.replace(/（有）|有限会社/g, '')
  normalized = normalized.replace(/（合）|合同会社/g, '')
  normalized = normalized.replace(/合資会社|合名会社/g, '')
  normalized = normalized.replace(/\bInc\.?\b/gi, '')
  normalized = normalized.replace(/\bLtd\.?\b/gi, '')
  normalized = normalized.replace(/\bLLC\.?\b/gi, '')
  normalized = normalized.replace(/\bCo\.?,?\s*Ltd\.?\b/gi, '')
  normalized = normalized.replace(/\bCorp\.?\b/gi, '')
  normalized = normalized.replace(/\bCorporation\b/gi, '')

  // 記号除去
  normalized = normalized.replace(/[()（）【】［］]/g, '')
  
  // 空白を圧縮
  normalized = normalized.replace(/\s+/g, ' ')

  // 前後の空白を削除
  normalized = normalized.trim()

  return normalized
}
