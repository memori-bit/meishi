// URLの正規化（公式URLを確実に取得）

export function normalizeUrl(url: string, emailDomain?: string): string | null {
  if (!url || url.trim() === '') {
    // URLが無い場合はメールドメインから推測
    if (emailDomain) {
      // 一般的なメールプロバイダーは除外
      const commonProviders = [
        'gmail.com',
        'yahoo.co.jp',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'icloud.com',
        'me.com',
        'mac.com',
      ]
      const domainLower = emailDomain.toLowerCase()
      if (!commonProviders.some((p) => domainLower.includes(p))) {
        return `https://${emailDomain}`
      }
    }
    return null
  }

  let normalized = url.trim()

  // メールアドレスを除外
  if (normalized.includes('@')) {
    return null
  }

  // http(s)://が無い場合は追加
  if (!normalized.match(/^https?:\/\//i)) {
    // www.で始まる場合はhttps://を追加
    if (normalized.startsWith('www.')) {
      normalized = `https://${normalized}`
    } else {
      normalized = `https://${normalized}`
    }
  }

  // 末尾のスラッシュを削除（統一）
  normalized = normalized.replace(/\/+$/, '')

  // URL形式の検証
  try {
    new URL(normalized)
    return normalized
  } catch {
    return null
  }
}

// ドメイン抽出
export function extractDomain(url: string): string {
  if (!url) return ''
  
  try {
    const urlObj = new URL(url)
    let domain = urlObj.hostname.toLowerCase()
    // www.を除去
    if (domain.startsWith('www.')) {
      domain = domain.substring(4)
    }
    return domain
  } catch {
    // URL形式でない場合は、ドメインっぽい部分を抽出
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/)
    if (match && match[1]) {
      return match[1].toLowerCase()
    }
    return ''
  }
}
