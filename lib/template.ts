// テンプレート置換（URLエンコード付き）

export interface TemplateData {
  email?: string
  name?: string
  company?: string
  phone?: string
  title?: string
  department?: string
  website?: string
  address?: string
}

// テンプレート変数を実際の値に置換（URLエンコード）
export function replaceTemplate(
  template: string,
  data: TemplateData
): string {
  let result = template

  // 各変数を置換（値が無い場合は空文字）
  const replacements: Record<string, string> = {
    email: data.email || '',
    name: data.name || '',
    company: data.company || '',
    phone: data.phone || '',
    title: data.title || '',
    department: data.department || '',
    website: data.website || '',
    address: data.address || '',
  }

  // テンプレート変数を置換
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    // URLエンコードして置換
    const encodedValue = encodeURIComponent(value)
    result = result.replace(regex, encodedValue)
  }

  return result
}

// テンプレートの検証（基本的なチェック）
export function validateTemplate(template: string): {
  valid: boolean
  error?: string
} {
  if (!template || template.trim() === '') {
    return { valid: false, error: 'テンプレートが空です' }
  }

  // URL形式の基本的なチェック（http://またはhttps://で始まる）
  const urlPattern = /^https?:\/\/.+/i
  if (!urlPattern.test(template)) {
    return { valid: false, error: 'http://またはhttps://で始まるURLを入力してください' }
  }

  return { valid: true }
}

