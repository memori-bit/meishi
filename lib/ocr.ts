// Google Cloud Vision APIを使用したOCR処理

import { ImageAnnotatorClient } from '@google-cloud/vision'
import { parseBusinessCard } from './parser'
import type { OcrFields, OcrResponse } from '@/types/ocr'

// 環境変数からサービスアカウントのパスを取得
// Cloud Run環境では未設定でもOK（Application Default Credentialsを使用）
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!credentialsPath && process.env.NODE_ENV !== 'production') {
  console.warn(
    'GOOGLE_APPLICATION_CREDENTIALS is not set. Local development may not work.'
  )
}

// Vision APIクライアント（シングルトン）
let client: ImageAnnotatorClient | null = null

function getClient(): ImageAnnotatorClient {
  if (!client) {
    // Cloud Run環境ではサービスアカウントが自動的に使用される
    // ローカル開発環境ではGOOGLE_APPLICATION_CREDENTIALSでファイルパスを指定
    if (credentialsPath) {
      // ローカル開発環境: ファイルパス指定
      client = new ImageAnnotatorClient({
        keyFilename: credentialsPath,
      })
    } else {
      // Cloud Run環境: Application Default Credentials
      // サービスアカウントがアタッチされていれば自動的に使用される
      client = new ImageAnnotatorClient()
    }
  }
  return client
}

// OCR結果の詳細情報
export interface OCRResult {
  text: string
  rawText: string // 生テキスト（デバッグ用）
  blocks?: any[] // テキストブロック情報（位置情報含む）
  confidence?: number // 平均信頼度
}

function extractMobile(text: string): string {
  const mobileRegex = /(070|080|090)[-.\s]?\d{4}[-.\s]?\d{4}/g
  const matches = text.match(mobileRegex)
  if (!matches || matches.length === 0) return ''
  return matches[0].replace(/[-.\s]/g, '-')
}

function buildFields(frontText: string, backText: string): OcrFields {
  const parsed = parseBusinessCard(frontText, backText, false).data
  const combined = `${frontText}\n${backText}`.trim()
  const mobile = extractMobile(combined)

  return {
    company_name: parsed.company_name || '',
    person_name: parsed.person_name || '',
    department: parsed.department || '',
    title: parsed.title || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    mobile: mobile || '',
    postal_code: parsed.postalCode || '',
    address: parsed.address || '',
    website: parsed.website || '',
  }
}

function buildDummyResponse(): OcrResponse {
  return {
    raw_text_front: 'DUMMY_OCR_FRONT',
    raw_text_back: 'DUMMY_OCR_BACK',
    fields: {
      company_name: '',
      person_name: '',
      department: '',
      title: '',
      email: '',
      phone: '',
      mobile: '',
      postal_code: '',
      address: '',
      website: '',
    },
  }
}

// テキストの文字数をカウント（空白除く）
function countNonWhitespaceChars(text: string): number {
  return text.replace(/\s/g, '').length
}

// 画像からテキストを抽出（改善版）
export async function extractTextFromImage(
  imageBuffer: Buffer
): Promise<OCRResult> {
  try {
    const visionClient = getClient()

    // 1. まず documentTextDetection を試す（名刺などの構造化文書に適している）
    // 言語ヒントを追加して精度向上（日本語と英語を優先）
    const [result] = await visionClient.documentTextDetection({
      image: { content: imageBuffer },
      imageContext: {
        languageHints: ['ja', 'en'], // 日本語と英語を優先
      },
    })

    const fullTextAnnotation = result.fullTextAnnotation
    let extractedText = ''
    let textBlocks: any[] = []

    if (fullTextAnnotation && fullTextAnnotation.text) {
      extractedText = fullTextAnnotation.text.trim()
      
      // テキストブロック情報を取得（位置情報含む）
      if (fullTextAnnotation.pages && fullTextAnnotation.pages.length > 0) {
        const page = fullTextAnnotation.pages[0]
        if (page.blocks) {
          textBlocks = page.blocks.map((block: any) => {
            const blockText = block.paragraphs
              ?.map((p: any) => 
                p.words?.map((w: any) => w.symbols?.map((s: any) => s.text).join('')).join('')
              ).join(' ') || ''
            
            return {
              text: blockText,
              boundingBox: block.boundingBox,
              confidence: block.confidence,
            }
          })
        }
      }

      // 文字数が極端に少ない場合（5文字未満）のみフォールバック（処理速度優先）
      const charCount = countNonWhitespaceChars(extractedText)
      if (charCount >= 5) {
        // 信頼度計算を簡略化（処理速度優先）
        // 最初のブロックの信頼度のみを使用
        const confidence = textBlocks.length > 0 && textBlocks[0].confidence !== undefined
          ? textBlocks[0].confidence
          : undefined

        return {
          text: extractedText,
          rawText: extractedText,
          blocks: textBlocks,
          confidence,
        }
      } else {
        console.warn(`documentTextDetection returned too few characters (${charCount}), falling back to textDetection`)
      }
    }

    // 2. フォールバック: textDetectionを使用（文字量が少ない場合のみ）
    const [textResult] = await visionClient.textDetection({
      image: { content: imageBuffer },
    })

    const detections = textResult.textAnnotations || []
    if (detections.length === 0) {
      return {
        text: '',
        rawText: '',
        blocks: [],
      }
    }

    // 最初の要素は全文（残りは個別の単語や行）
    const fullText = detections[0].description || ''
    const charCount = countNonWhitespaceChars(fullText)

    // フォールバックでも文字数が少ない場合は警告
    if (charCount < 10) {
      console.warn(`textDetection also returned few characters (${charCount})`)
    }

    return {
      text: fullText.trim(),
      rawText: fullText.trim(),
      blocks: detections.slice(1).map((det: any) => ({
        text: det.description || '',
        boundingBox: det.boundingPoly,
      })),
    }
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error(`OCR processing failed: ${error}`)
  }
}

// 複数画像からテキストを抽出（表・裏）
export async function extractTextFromImages(
  frontImageBuffer: Buffer,
  backImageBuffer?: Buffer
): Promise<{ front: OCRResult; back: OCRResult }> {
  const frontResult = await extractTextFromImage(frontImageBuffer)
  const backResult = backImageBuffer
    ? await extractTextFromImage(backImageBuffer)
    : { text: '', rawText: '', blocks: [] }

  return {
    front: frontResult,
    back: backResult,
  }
}

export async function runOcr(
  frontImageBuffer: Buffer,
  backImageBuffer?: Buffer
): Promise<OcrResponse> {
  const provider =
    process.env.OCR_PROVIDER ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'google' : 'dummy')

  if (provider === 'dummy') {
    return buildDummyResponse()
  }

  try {
    const { front, back } = await extractTextFromImages(frontImageBuffer, backImageBuffer)
    return {
      raw_text_front: front.rawText || front.text || '',
      raw_text_back: back.rawText || back.text || '',
      fields: buildFields(front.text || '', back.text || ''),
    }
  } catch (error) {
    console.warn('OCR failed, falling back to dummy:', error)
    return buildDummyResponse()
  }
}

