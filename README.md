# 名刺OCR MVP

名刺撮影→OCR→確認/修正→リード保存→履歴表示までのMVP実装。

## 機能

- 名刺撮影/アップロード（モバイル対応）
- 自動OCR実行
- OCR結果の表示・編集
- OCR結果の確認・修正
- リードDB保存
- 履歴一覧/詳細表示

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Font Awesome
- Google Cloud Vision API (OCR)
- Prisma（将来のDB永続化用）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```bash
# Google Cloud Vision API（必須）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# その他の環境変数は .env.example を参照
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000/capture` を開いてください。

## ディレクトリ構成

```
app/
  capture/           # 撮影/OC R/保存
  history/           # 履歴一覧/詳細
  settings/          # 設定（UIのみ）
  api/
    ocr/             # OCR API
    leads/           # リードAPI
    health/          # ヘルスチェック API

components/
  widgets/           # ウィジェットコンポーネント
  WidgetCard.tsx    # 共通ウィジェットカード

lib/
  ocr/               # OCR処理
  normalizers/       # 正規化ユーティリティ

types/
  ocr.ts             # 型定義
```

## ウィジェット一覧

1. **BusinessCardUploaderWidget** - 名刺撮影/アップロード

## API仕様

### POST /api/ocr

名刺画像からOCRを実行し、候補データを返す。

**Request:**
- `multipart/form-data`
- `image`: File

**Response:**
```json
{
  "companyNameCandidate": "株式会社サンプル",
  "personNameCandidate": "山田太郎",
  "titleCandidate": "代表取締役",
  "urlCandidate": "https://example.com",
  "fields": {
    "company_name": "株式会社サンプル",
    "person_name": "山田太郎",
    "department": "営業部",
    "title": "部長",
    "email": "taro@example.com",
    "phone": "03-1234-5678",
    "mobile": "090-1234-5678",
    "address": "東京都...",
    "website": "https://example.com"
  }
}
```

### POST /api/leads

OCR結果をリードとして保存する。

**Request:**
```json
{
  "fields": {
    "company_name": "株式会社サンプル",
    "person_name": "山田太郎",
    "department": "営業部",
    "title": "部長",
    "email": "taro@example.com",
    "phone": "03-1234-5678",
    "mobile": "090-1234-5678",
    "address": "東京都...",
    "website": "https://example.com"
  },
  "raw_text_front": "....",
  "raw_text_back": "...."
}
```

**Response:**
```json
{
  "id": "uuid"
}
```

### GET /api/leads

履歴一覧（新しい順）

### GET /api/leads/:id

履歴詳細

### GET /api/health

ヘルスチェック。

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 注意事項

- 名刺画像は保存しない（DB/ストレージに保存しない）

## ライセンス

MIT
