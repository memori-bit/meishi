// 画像前処理：EXIF回転補正、リサイズ、コントラスト、シャープネス、ノイズ除去
import sharp from 'sharp'

const TARGET_LONG_EDGE = 2000 // 長辺を2000pxにリサイズ（処理速度と精度のバランス）

/**
 * 名刺画像を前処理してOCR精度を向上させる
 * @param imageBuffer 元の画像バッファ
 * @returns 前処理済み画像バッファ
 */
export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    let image = sharp(imageBuffer)

    // 1. EXIF回転補正（自動的に適用される）
    image = image.rotate()

    // 2. メタデータを取得してサイズを確認
    const metadata = await image.metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0
    const longEdge = Math.max(width, height)

    // 3. リサイズ（長辺が3000pxを超える場合のみ縮小、小さすぎる場合は拡大）
    if (longEdge > TARGET_LONG_EDGE) {
      if (width > height) {
        image = image.resize(TARGET_LONG_EDGE, null, {
          withoutEnlargement: true,
          fit: 'inside',
          kernel: 'lanczos3', // 高品質なリサイズアルゴリズム
        })
      } else {
        image = image.resize(null, TARGET_LONG_EDGE, {
          withoutEnlargement: true,
          fit: 'inside',
          kernel: 'lanczos3',
        })
      }
    } else if (longEdge < 1200) {
      // 小さすぎる場合は拡大（最大3倍まで）
      const scale = Math.min(3, 1200 / longEdge)
      if (width > height) {
        image = image.resize(Math.round(width * scale), null, {
          withoutEnlargement: false,
          kernel: 'lanczos3',
        })
      } else {
        image = image.resize(null, Math.round(height * scale), {
          withoutEnlargement: false,
          kernel: 'lanczos3',
        })
      }
    }

    // 4. コントラストを強化（軽めに、処理速度優先）
    image = image.linear(1.15, -(128 * 0.15))

    // 5. 明度を少し上げる（暗い画像対策）
    image = image.modulate({
      brightness: 1.03,
      saturation: 1.0,
    })

    // 6. シャープネスを強化（軽めに）
    image = image.sharpen(0.8, 1, 2)

    // 7. JPEG形式で出力（処理速度優先、品質は85で十分）
    const processedBuffer = await image
      .jpeg({
        quality: 85,
        mozjpeg: true,
      })
      .toBuffer()

    return processedBuffer
  } catch (error) {
    console.error('Image preprocessing error:', error)
    // エラー時は元の画像をそのまま返す
    return imageBuffer
  }
}
