// OCRテキストから構造化データを抽出（ハイブリッド方式：正規表現 + ヒューリスティック + スコアリング）

export interface BusinessCardData {
  company_name: string
  person_name: string
  email: string
  phone: string
  title: string
  department: string
  website: string
  address: string
  postalCode?: string // 郵便番号
}

// デバッグ用：候補情報
export interface ExtractionCandidates {
  company_name: Array<{ text: string; score: number; reason: string }>
  person_name: Array<{ text: string; score: number; reason: string }>
  title: Array<{ text: string; score: number; reason: string }>
  department: Array<{ text: string; score: number; reason: string }>
}

export interface ParsedBusinessCard {
  data: BusinessCardData
  candidates?: ExtractionCandidates // デバッグ用
  rawText?: string // OCR生テキスト（デバッグ用）
}

// ========== 1. 正規表現で確定（高精度） ==========

// メールアドレス抽出
function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  return matches && matches.length > 0 ? matches[0] : ''
}

// 電話番号抽出（日本の電話番号パターン）
function extractPhone(text: string): string {
  // 0から始まる数字列（ハイフン有無）
  const phoneRegex = /0\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{4}/g
  const matches = text.match(phoneRegex)
  if (matches && matches.length > 0) {
    // ハイフンを統一
    return matches[0].replace(/[-.\s]/g, '-')
  }
  return ''
}

// 一般的なメールプロバイダーのドメインリスト
const COMMON_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.co.jp', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'aol.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'mail.ru', 'qq.com', '163.com', 'sina.com',
  'naver.com', 'daum.net', 'hanmail.net', 'rediffmail.com'
]

// メールドメインが独自ドメインかどうかを判定
function isCustomDomain(domain: string): boolean {
  if (!domain) return false
  const domainLower = domain.toLowerCase()
  return !COMMON_EMAIL_PROVIDERS.some(provider => domainLower.includes(provider))
}

// ウェブサイトURL抽出（メールアドレスを除外、独自ドメインの場合はドメインを返す）
function extractWebsite(text: string, email: string): string {
  // メールアドレスを除外するためのパターン
  const emailDomain = email ? email.split('@')[1] : ''
  
  // http(s):// または www. で始まるURLを優先的に検索
  const httpUrlRegex = /https?:\/\/[^\s]+/g
  const wwwUrlRegex = /www\.[^\s]+/g
  const domainUrlRegex = /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/g
  
  // 1. http(s)://で始まるURLを優先
  const httpMatches = text.match(httpUrlRegex)
  if (httpMatches && httpMatches.length > 0) {
    for (const match of httpMatches) {
      // メールアドレスでないことを確認
      if (!match.includes('@')) {
        return match
      }
    }
  }
  
  // 2. www.で始まるURL
  const wwwMatches = text.match(wwwUrlRegex)
  if (wwwMatches && wwwMatches.length > 0) {
    for (const match of wwwMatches) {
      // メールアドレスでないことを確認
      if (!match.includes('@')) {
        return 'https://' + match
      }
    }
  }
  
  // 3. ドメイン形式のURL（メールアドレスを除外）
  const domainMatches = text.match(domainUrlRegex)
  if (domainMatches && domainMatches.length > 0) {
    for (const match of domainMatches) {
      // メールアドレスパターンでないことを確認
      if (match.includes('@')) {
        continue
      }
      // メールアドレスのドメインと一致しないことを確認
      if (emailDomain && match === emailDomain) {
        continue
      }
      // http(s)://やwww.で始まっていない場合のみ追加
      if (!match.startsWith('http') && !match.startsWith('www.')) {
        return 'https://' + match
      }
    }
  }
  
  // 4. メールドメインが独自ドメインの場合、そのドメインをWebサイトとして返す
  // （リサーチ時にHPを探すため）
  if (emailDomain && isCustomDomain(emailDomain)) {
    return `https://${emailDomain}`
  }
  
  return ''
}

// ========== 2. ヒューリスティックで推定（中精度） ==========

// 郵便番号を「123-4567」形式に正規化（〒は付けない）
function normalizePostalCode(postalCode: string): string {
  if (!postalCode) return ''
  // 先頭のハイフンや空白を除去
  let cleaned = postalCode.trim().replace(/^[-.\s〒]+/, '')
  // 数字のみを抽出
  const digits = cleaned.replace(/[^\d]/g, '')
  if (digits.length !== 7) return ''
  // 「123-4567」形式に変換（〒は付けない）
  return `${digits.substring(0, 3)}-${digits.substring(3)}`
}

// 郵便番号抽出（住所をアンカーとした厳格な判定ルール）
function extractPostalCode(text: string, phone: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // 都道府県名のパターン
  const prefectureRegex = /(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/
  
  // 住所語のパターン（住所ブロックの定義）
  const addressWordRegex = /(市|区|町|村|丁目|番地|番|号|ビル|マンション|アパート|建物|都|道|府|県)/
  
  // 電話番号ラベルのパターン
  const phoneLabelRegex = /(TEL|電話|FAX|Fax|Mobile|携帯|Phone|PHONE|tel|phone|mobile|携帯電話|固定電話|内線)/
  
  // 電話番号で始まるパターン（無条件除外）
  const phoneStartRegex = /^(090|080|070|050|03|06)\d/
  
  // 1. まず「住所ブロック」を特定する
  const addressBlockIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 都道府県名または住所語を含む行を住所ブロックとして特定
    if (prefectureRegex.test(line) || addressWordRegex.test(line)) {
      addressBlockIndices.push(i)
      // 連続する住所ブロックも含める（次の行もチェック）
      if (i < lines.length - 1 && addressWordRegex.test(lines[i + 1])) {
        addressBlockIndices.push(i + 1)
      }
    }
  }
  
  // 住所ブロックが見つからない場合は空文字列を返す
  if (addressBlockIndices.length === 0) {
    return ''
  }
  
  // 2. 住所ブロックの近く（直前行または同一行）にある郵便番号候補を探す
  interface Candidate {
    match: string
    digits: string
    lineIndex: number
    distance: number // 住所ブロックからの距離
    score: number
    reason: string
  }
  
  const candidates: Candidate[] = []
  
  // 各住所ブロックに対して、その直前行と同一行をチェック
  for (const addressIndex of addressBlockIndices) {
    // 同一行をチェック
    const addressLine = lines[addressIndex]
    
    // 「〒」記号の直後にある数字を最優先で検索（同一行）
    const yubinRegex = /〒\s*(\d{3}[-.\s]?\d{4}|\d{7})/g
    let yubinMatch
    while ((yubinMatch = yubinRegex.exec(addressLine)) !== null) {
      const match = yubinMatch[0]
      const digits = match.replace(/[^\d]/g, '')
      if (digits.length === 7) {
        // 電話番号で始まる場合は除外
        if (phoneStartRegex.test(digits)) {
          continue
        }
        // 電話番号ラベルが近くにある場合は除外
        const context = addressLine.toLowerCase()
        if (phoneLabelRegex.test(context)) {
          continue
        }
        candidates.push({
          match,
          digits,
          lineIndex: addressIndex,
          distance: 0, // 同一行
          score: 100, // 最高スコア
          reason: '〒記号の直後（住所同一行）'
        })
      }
    }
    
    // 3桁-4桁または7桁連続のパターンを検索（同一行）
    const postalRegex = /\b(\d{3}[-.\s]?\d{4}|\d{7})\b/g
    let match
    while ((match = postalRegex.exec(addressLine)) !== null) {
      const fullMatch = match[0]
      const digits = fullMatch.replace(/[^\d]/g, '')
      
      if (digits.length !== 7) continue
      
      // 電話番号で始まる場合は無条件で除外
      if (phoneStartRegex.test(digits)) {
        continue
      }
      
      // 電話番号と完全一致する場合は除外
      const phoneNormalized = phone ? phone.replace(/[-.\s]/g, '') : ''
      if (phoneNormalized && digits === phoneNormalized) {
        continue
      }
      
      // 電話番号ラベルが近くにある場合は除外
      const context = addressLine.toLowerCase()
      if (phoneLabelRegex.test(context)) {
        continue
      }
      
      candidates.push({
        match: fullMatch,
        digits,
        lineIndex: addressIndex,
        distance: 0, // 同一行
        score: 80,
        reason: '住所同一行'
      })
    }
    
    // 直前行をチェック（住所ブロックの直前）
    if (addressIndex > 0) {
      const prevLine = lines[addressIndex - 1]
      
      // 「〒」記号の直後にある数字を検索（直前行）
      const yubinRegexPrev = /〒\s*(\d{3}[-.\s]?\d{4}|\d{7})/g
      let yubinMatchPrev
      while ((yubinMatchPrev = yubinRegexPrev.exec(prevLine)) !== null) {
        const match = yubinMatchPrev[0]
        const digits = match.replace(/[^\d]/g, '')
        if (digits.length === 7) {
          // 電話番号で始まる場合は除外
          if (phoneStartRegex.test(digits)) {
            continue
          }
          // 電話番号ラベルが近くにある場合は除外
          const context = `${prevLine} ${addressLine}`.toLowerCase()
          if (phoneLabelRegex.test(context)) {
            continue
          }
          candidates.push({
            match,
            digits,
            lineIndex: addressIndex - 1,
            distance: 1, // 直前行
            score: 90,
            reason: '〒記号の直後（住所直前行）'
          })
        }
      }
      
      // 3桁-4桁または7桁連続のパターンを検索（直前行）
      const postalRegexPrev = /\b(\d{3}[-.\s]?\d{4}|\d{7})\b/g
      let matchPrev
      while ((matchPrev = postalRegexPrev.exec(prevLine)) !== null) {
        const fullMatch = matchPrev[0]
        const digits = fullMatch.replace(/[^\d]/g, '')
        
        if (digits.length !== 7) continue
        
        // 電話番号で始まる場合は無条件で除外
        if (phoneStartRegex.test(digits)) {
          continue
        }
        
        // 電話番号と完全一致する場合は除外
        const phoneNormalized = phone ? phone.replace(/[-.\s]/g, '') : ''
        if (phoneNormalized && digits === phoneNormalized) {
          continue
        }
        
        // 電話番号ラベルが近くにある場合は除外
        const context = `${prevLine} ${addressLine}`.toLowerCase()
        if (phoneLabelRegex.test(context)) {
          continue
        }
        
        // 郵便番号のみの行の場合はスコアを上げる
        const isPostalCodeOnly = /^[〒]?\s*\d{3}[-.\s]?\d{4}\s*$/.test(prevLine)
        
        candidates.push({
          match: fullMatch,
          digits,
          lineIndex: addressIndex - 1,
          distance: 1, // 直前行
          score: isPostalCodeOnly ? 85 : 70,
          reason: isPostalCodeOnly ? '住所直前行（郵便番号のみ）' : '住所直前行'
        })
      }
    }
  }
  
  // 3. 候補をスコアでソート
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // スコアが同じ場合は距離が近い方を優先
    return a.distance - b.distance
  })
  
  // 4. 最高スコアの候補を採用（確実に1つ特定できる場合のみ）
  if (candidates.length > 0 && candidates[0].score >= 70) {
    // 最高スコアが100（〒記号、同一行）の場合は確実に採用
    if (candidates[0].score === 100) {
      return normalizePostalCode(candidates[0].match)
    }
    
    // 最高スコアが他の候補より大幅に高い場合のみ採用
    if (candidates.length === 1 || candidates[0].score - (candidates[1]?.score || 0) >= 10) {
      return normalizePostalCode(candidates[0].match)
    }
  }
  
  // 自信がない場合は空文字列を返す
  return ''
}

// 住所抽出（都道府県パターン、電話番号・郵便番号を除外）
// 戻り値: { address: string, postalCode: string } - 住所と郵便番号を返す
function extractAddress(text: string, postalCode: string, phone: string): { address: string; postalCode: string } {
  const prefectureRegex =
    /(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // 電話番号パターン（完全一致をチェック）
  const phoneNormalized = phone ? phone.replace(/[-.\s]/g, '') : ''
  
  // 郵便番号パターン（完全一致をチェック）
  let foundPostalCode = postalCode
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (prefectureRegex.test(line)) {
      // 都道府県を含む行を見つけた
      const addressLines: string[] = []
      
      // 前の行をチェック（郵便番号の可能性）
      if (i > 0) {
        const prevLine = lines[i - 1]
        const prevLineNormalized = prevLine.replace(/[^\d]/g, '')
        // 郵便番号のみの行で、電話番号と一致しない場合
        if (/^[〒]?\d{3}[-.\s]?\d{4}$/.test(prevLine) && 
            prevLineNormalized !== phoneNormalized &&
            prevLineNormalized.length === 7) {
          // 郵便番号を保存（まだ保存されていない場合、または既存のものより確実な場合）
          const normalizedPrev = normalizePostalCode(prevLine)
          if (!foundPostalCode || (normalizedPrev && !foundPostalCode.startsWith('〒'))) {
            foundPostalCode = normalizedPrev
          }
          // 住所には含めない（郵便番号は別途表示）
        } else if (!/\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{4}/.test(prevLine) && 
                   !/^[〒]?\d{3}[-.\s]?\d{4}$/.test(prevLine)) {
          // 電話番号でも郵便番号でもない行のみ含める
          addressLines.push(prevLine)
        }
      }
      
      // 都道府県を含む行を処理
      let addressLine = line
      // 電話番号を除去（正規表現で）
      addressLine = addressLine.replace(/0\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{4}/g, '').trim()
      // 郵便番号を除去
      addressLine = addressLine.replace(/[〒]?\d{3}[-.\s]?\d{4}/g, '').trim()
      // 余分な空白を整理
      addressLine = addressLine.replace(/\s+/g, ' ').trim()
      if (addressLine) {
        addressLines.push(addressLine)
      }
      
      // 次の行をチェック（住所の続きの可能性）
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1]
        // 電話番号や郵便番号でない行のみ含める
        if (!/\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{4}/.test(nextLine) && 
            !/^[〒]?\d{3}[-.\s]?\d{4}$/.test(nextLine)) {
          addressLines.push(nextLine)
        }
      }
      
      // 結合して、電話番号や郵便番号を完全に除去
      let address = addressLines.join(' ').trim()
      // 電話番号パターンを完全に除去
      address = address.replace(/0\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{4}/g, '').trim()
      // 余分な空白を整理
      address = address.replace(/\s+/g, ' ').trim()
      
      return { address, postalCode: foundPostalCode }
    }
  }
  return { address: '', postalCode: foundPostalCode }
}

// ========== 3. スコアリングベース抽出（低精度だが候補を返す） ==========

// テキスト行の情報
interface TextLine {
  text: string
  index: number
  length: number
  yPosition?: number // 位置情報があれば
}

// 会社名パターン
const companyPatterns = [
  /(株式会社|（株）|㈱|有限会社|（有）|合同会社|合資会社|合名会社|Inc\.|Ltd\.|LLC)/,
]

// 役職キーワード
const titleKeywords = [
  '代表', '社長', 'CEO', 'CTO', 'CFO', 'COO',
  '部長', '課長', '係長', '主任',
  'マネージャー', 'マネジャー', 'Manager',
  'Director', 'President', 'Vice President',
  '取締役', '専務', '常務', '監査役',
]

// 部署キーワード
const departmentKeywords = ['部', '課', '室', 'グループ', 'チーム', 'Division', 'Department']

// 除外パターン（会社名/氏名候補から除外）
const excludePatterns = [
  /@/, // メールアドレス
  /\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{4}/, // 電話番号
  /https?:\/\//, // URL
  /www\./, // URL
  /〒/, // 郵便番号
  /住所/, // 住所
]

// 会社名候補を抽出（スコアリング）
function extractCompanyNameCandidates(
  lines: TextLine[],
  email: string,
  phone: string,
  website: string
): Array<{ text: string; score: number; reason: string }> {
  const candidates: Array<{ text: string; score: number; reason: string }> = []

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    let score = 0
    const reasons: string[] = []

    // 除外パターンチェック
    if (excludePatterns.some((pattern) => pattern.test(line.text))) {
      continue
    }

    // 会社パターンを含む（高スコア）
    if (companyPatterns.some((pattern) => pattern.test(line.text))) {
      score += 50
      reasons.push('会社パターン一致')
    }

    // 上部にある（会社名は通常上部）
    if (i < 3) {
      score += 30 - i * 5
      reasons.push(`上位${i + 1}行目`)
    }

    // 適切な長さ（3-50文字）
    if (line.length >= 3 && line.length <= 50) {
      score += 10
      reasons.push('適切な長さ')
    } else {
      score -= 20
    }

    // メール/電話/URLと一致しない
    if (email && !line.text.includes(email.split('@')[0])) {
      score += 5
    }
    if (phone && !line.text.includes(phone.replace(/[-.\s]/g, ''))) {
      score += 5
    }
    if (website && !line.text.includes(website)) {
      score += 5
    }

    if (score > 0) {
      candidates.push({
        text: line.text,
        score,
        reason: reasons.join(', '),
      })
    }
  }

  // スコアでソート（降順）
  return candidates.sort((a, b) => b.score - a.score).slice(0, 3)
}

// 氏名候補を抽出（スコアリング）
function extractPersonNameCandidates(
  lines: TextLine[],
  email: string,
  companyName: string,
  title: string
): Array<{ text: string; score: number; reason: string }> {
  const candidates: Array<{ text: string; score: number; reason: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let score = 0
    const reasons: string[] = []

    // 除外パターンチェック
    if (excludePatterns.some((pattern) => pattern.test(line.text))) {
      continue
    }

    // 役職キーワードを含まない
    if (titleKeywords.some((keyword) => line.text.includes(keyword))) {
      continue
    }

    // 適切な長さ（2-20文字、日本語名は通常短い）
    if (line.length >= 2 && line.length <= 20) {
      score += 20
      reasons.push('適切な長さ')
    } else {
      continue
    }

    // メールアドレスの@より前の部分と一致（高スコア）
    if (email) {
      const emailPrefix = email.split('@')[0].toLowerCase()
      const lineLower = line.text.toLowerCase()
      if (lineLower.includes(emailPrefix) || emailPrefix.includes(lineLower.replace(/\s/g, ''))) {
        score += 40
        reasons.push('メールと一致')
      }
      // メール行の直前
      if (i > 0 && lines[i - 1].text.includes(email)) {
        score += 30
        reasons.push('メール直前')
      }
    }

    // 役職行の直前
    if (title && i > 0 && lines[i - 1].text.includes(title)) {
      score += 25
      reasons.push('役職直前')
    }

    // 会社名を含まない（重要：会社名と個人名を区別）
    if (companyName && line.text.includes(companyName)) {
      score -= 100 // 会社名を含む場合は大幅に減点
      reasons.push('会社名を含む')
    }
    
    // 会社名の直後（会社名の次の行）
    if (companyName) {
      const companyIndex = lines.findIndex((l) => l.text.includes(companyName))
      if (companyIndex >= 0 && i === companyIndex + 1 && !line.text.includes(companyName)) {
        score += 20
        reasons.push('会社名直後')
      }
    }

    // 上部にある（氏名は通常上部）
    if (i < 5) {
      score += 15 - i * 2
      reasons.push(`上位${i + 1}行目`)
    }

    // 数字を含まない（氏名は通常数字を含まない）
    if (!/\d/.test(line.text)) {
      score += 5
    }

    if (score > 0) {
      candidates.push({
        text: line.text,
        score,
        reason: reasons.join(', '),
      })
    }
  }

  // スコアでソート（降順）
  return candidates.sort((a, b) => b.score - a.score).slice(0, 3)
}

// 役職候補を抽出
function extractTitleCandidates(
  lines: TextLine[]
): Array<{ text: string; score: number; reason: string }> {
  const candidates: Array<{ text: string; score: number; reason: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let score = 0
    const reasons: string[] = []

    // 役職キーワードを含む
    const matchedKeyword = titleKeywords.find((keyword) => line.text.includes(keyword))
    if (matchedKeyword) {
      score += 50
      reasons.push(`役職キーワード: ${matchedKeyword}`)
    } else {
      continue
    }

    // 上部にある
    if (i < 5) {
      score += 20 - i * 3
      reasons.push(`上位${i + 1}行目`)
    }

    // 適切な長さ
    if (line.length >= 2 && line.length <= 30) {
      score += 10
    }

    candidates.push({
      text: line.text,
      score,
      reason: reasons.join(', '),
    })
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3)
}

// 部署候補を抽出
function extractDepartmentCandidates(
  lines: TextLine[],
  title: string
): Array<{ text: string; score: number; reason: string }> {
  const candidates: Array<{ text: string; score: number; reason: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let score = 0
    const reasons: string[] = []

    // 部署キーワードを含む
    if (departmentKeywords.some((keyword) => line.text.includes(keyword))) {
      score += 40
      reasons.push('部署キーワード一致')
    } else {
      continue
    }

    // 役職行の前後
    if (title) {
      const titleIndex = lines.findIndex((l) => l.text.includes(title))
      if (titleIndex >= 0) {
        if (i === titleIndex - 1 || i === titleIndex + 1) {
          score += 30
          reasons.push('役職前後')
        }
      }
    }

    // 適切な長さ
    if (line.length >= 2 && line.length <= 20) {
      score += 10
    }

    candidates.push({
      text: line.text,
      score,
      reason: reasons.join(', '),
    })
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3)
}

// ========== メイン関数 ==========

export function parseBusinessCard(
  frontText: string,
  backText: string = '',
  showDebug: boolean = false
): ParsedBusinessCard {
  const combinedText = `${frontText}\n${backText}`.trim()
  const lines = combinedText
    .split('\n')
    .map((line, index) => ({
      text: line.trim(),
      index,
      length: line.trim().length,
    }))
    .filter((line) => line.length > 0)

  // 1. 正規表現で確定
  const email = extractEmail(combinedText)
  const phone = extractPhone(combinedText)
  const postalCode = extractPostalCode(combinedText, phone) // 電話番号を渡して除外
  const website = extractWebsite(combinedText, email) // メールアドレスを渡して除外

  // 2. ヒューリスティックで推定（電話番号と郵便番号を渡して重複を除去）
  const addressResult = extractAddress(combinedText, postalCode, phone)
  const address = addressResult.address
  // 住所抽出で見つかった郵便番号を優先し、形式を統一
  // extractPostalCodeで既に正規化済み（「123-4567」形式）なので、そのまま使用
  let finalPostalCode = ''
  if (postalCode) {
    // 既に「123-4567」形式で正規化されている
    finalPostalCode = postalCode
  } else if (addressResult.postalCode) {
    // 住所抽出で見つかった郵便番号を正規化
    const digits = addressResult.postalCode.replace(/[^\d]/g, '')
    if (digits.length === 7) {
      finalPostalCode = normalizePostalCode(addressResult.postalCode)
    }
  }
  // 空文字列の場合はundefinedに
  if (!finalPostalCode) {
    finalPostalCode = undefined as any
  }

  // 3. スコアリングベース抽出（候補を取得）
  const companyCandidates = extractCompanyNameCandidates(lines, email, phone, website)
  const company_name = companyCandidates.length > 0 ? companyCandidates[0].text : ''

  const titleCandidates = extractTitleCandidates(lines)
  const title = titleCandidates.length > 0 ? titleCandidates[0].text : ''

  const departmentCandidates = extractDepartmentCandidates(lines, title)
  const department = departmentCandidates.length > 0 ? departmentCandidates[0].text : ''

  const personCandidates = extractPersonNameCandidates(lines, email, company_name, title)
  const person_name = personCandidates.length > 0 ? personCandidates[0].text : ''

  const data: BusinessCardData = {
    company_name,
    person_name,
    email,
    phone,
    title,
    department,
    website,
    address,
    postalCode: finalPostalCode || undefined,
  }

  const result: ParsedBusinessCard = { data }

  // デバッグ情報を追加
  if (showDebug) {
    result.candidates = {
      company_name: companyCandidates,
      person_name: personCandidates,
      title: titleCandidates,
      department: departmentCandidates,
    }
    result.rawText = combinedText
  }

  return result
}
