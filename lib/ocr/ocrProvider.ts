/**
 * OCRプロバイダーのインターフェース
 * 実装は差し替え可能にする
 */

export interface OCRProvider {
  extractText(imageBuffer: Buffer): Promise<OCRResult>
}

export interface OCRResult {
  text: string
  rawText: string
  confidence?: number
}

/**
 * Google Cloud Vision API実装（既存の実装をラップ）
 */
import { extractTextFromImage as visionExtractText } from '@/lib/ocr'

export class GoogleVisionOCRProvider implements OCRProvider {
  async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    const result = await visionExtractText(imageBuffer)
    return {
      text: result.text,
      rawText: result.rawText,
      confidence: result.confidence,
    }
  }
}

/**
 * OCRプロバイダーのファクトリー
 */
export function createOCRProvider(): OCRProvider {
  // 環境変数で切り替え可能にする
  const providerType = process.env.OCR_PROVIDER || 'google-vision'
  
  switch (providerType) {
    case 'google-vision':
      return new GoogleVisionOCRProvider()
    default:
      return new GoogleVisionOCRProvider()
  }
}
