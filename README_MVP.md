# 名刺OCR MVP

## 概要

名刺を撮影/アップロード → OCR → 確認/修正 → リード保存 → 履歴確認。

## 使用方法

1. `/capture` にアクセス
2. 名刺の表（必要なら裏）を撮影/アップロード
3. OCRを実行
4. 候補を確認/修正して保存
5. `/history` で履歴を確認

## 環境変数

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
OCR_PROVIDER=google-vision
```
