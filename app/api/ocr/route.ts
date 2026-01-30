import { NextRequest, NextResponse } from 'next/server'
import { runOcr } from '@/lib/ocr'
import { preprocessImage } from '@/lib/imagePreprocess'
import type { OcrResponse } from '@/types/ocr'

// 画像サイズ制限（10MB）
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // multipart/form-dataから画像を取得
    const formData = await request.formData()
    const frontImageFile = formData.get('front_image') as File | null
    const backImageFile = formData.get('back_image') as File | null

    if (!frontImageFile) {
      return NextResponse.json(
        { error: 'Front image is required' },
        { status: 400 }
      )
    }

    // 画像サイズチェック
    if (
      frontImageFile.size > MAX_IMAGE_SIZE ||
      (backImageFile && backImageFile.size > MAX_IMAGE_SIZE)
    ) {
      return NextResponse.json(
        { error: 'Image is too large (max 10MB)' },
        { status: 400 }
      )
    }

    // 画像をBufferに変換
    const frontImageBuffer = Buffer.from(await frontImageFile.arrayBuffer())
    const backImageBuffer = backImageFile
      ? Buffer.from(await backImageFile.arrayBuffer())
      : undefined

    // 画像前処理（EXIF回転補正、リサイズ、コントラスト、シャープネス）
    const preprocessedFrontImage = await preprocessImage(frontImageBuffer)
    const preprocessedBackImage = backImageBuffer
      ? await preprocessImage(backImageBuffer)
      : undefined

    const response: OcrResponse = await runOcr(
      preprocessedFrontImage,
      preprocessedBackImage
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('OCR error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Google Cloud Vision APIの認証エラーの場合、より詳細なメッセージを返す
    if (errorMessage.includes('credentials') || errorMessage.includes('authentication') || errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      return NextResponse.json(
        {
          error: 'Google Cloud Vision API認証エラー',
          message: 'GOOGLE_APPLICATION_CREDENTIALS環境変数が設定されていないか、認証情報が無効です。',
          details: errorMessage,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
