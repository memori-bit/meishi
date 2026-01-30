# GCP設定チェック結果

## ✅ 正常に設定されている項目

### 1. IAM権限
- ✅ **Secret Manager Secret Accessor**: 付与済み
  - サービスアカウント: `meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com`
  - 権限: `roles/secretmanager.secretAccessor`
- ✅ **Service Usage Consumer**: 付与済み
  - 権限: `roles/serviceusage.serviceUsageConsumer`

### 2. Secret Manager
- ✅ 必要なSecretが全て登録済み:
  - `google-search-api-key`
  - `google-search-engine-id`
  - `nextauth-secret`
  - `openai-api-key`
  - `database-url`
  - `google-service-account-key`

### 3. Cloud SQLインスタンス
- ✅ インスタンス名: `meishi-db`
- ✅ ステータス: `RUNNABLE`（正常稼働中）
- ✅ リージョン: `us-central1`
- ✅ データベース: `meishi` 作成済み
- ✅ ユーザー: `meishi_user` 作成済み

### 4. Artifact Registry
- ✅ リポジトリ名: `meishiocr`
- ✅ リージョン: `asia-northeast1`
- ✅ 形式: DOCKER
- ✅ 状態: 正常

### 5. API有効化
- ✅ Artifact Registry API: 有効
- ✅ Cloud Run API: 有効
- ✅ Cloud Build API: 有効
- ✅ Cloud SQL Admin API: 有効

## ⚠️ 確認が必要な項目

### 1. Cloud SQL接続権限
**現状**: Cloud SQL Client権限が明示的に付与されていない可能性

**確認コマンド:**
```bash
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

**必要な権限:**
- `roles/cloudsql.client` - Cloud SQLへの接続に必要（`--add-cloudsql-instances`を使用する場合）

**注意**: `--add-cloudsql-instances`を使用する場合、サービスアカウントにCloud SQL Client権限が必要です。ただし、Cloud Runが自動的に権限を付与する場合もあります。

### 2. Vision API権限
**現状**: Vision API User権限が明示的に付与されていない可能性

**必要な権限:**
- `roles/ml.developer` または `roles/aiplatform.user` - Vision APIを使用する場合

**確認方法:**
```bash
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### 3. Cloud Runサービス
**現状**: サービスが存在しない（デプロイが成功していないため）

**確認コマンド:**
```bash
gcloud run services list --region=asia-northeast1 --project=bizcard-ocr-prod
```

## 🔴 現在のデプロイ失敗の原因

### 主な原因: Prismaクライアントのビルドエラー（アプリケーション側）

**エラー内容:**
```
Error: Cannot find module './client'
Require stack:
- /app/node_modules/.prisma/client/default.js
```

**原因:**
1. Prisma 7.xは`.prisma/client/client.ts`（TypeScript）のみを生成
2. `default.js`で`require('./client')`を実行するが、`.js`ファイルが存在しない
3. Node.jsの`require`は`.ts`ファイルを直接読み込めない

**GCP側の問題ではない:**
- ビルド段階で失敗しているため、GCP側の権限や設定の問題ではありません
- ビルドが成功すれば、GCP側の設定は問題なく動作する可能性が高いです

## 📋 推奨される対応

### 優先度1: Prismaクライアントの問題を修正（最優先）
- `default.js`の実装を修正
- または、Prismaの出力先をデフォルトに戻す

### 優先度2: Cloud SQL Client権限の確認（ビルド成功後）
- ビルドが成功した後、実行時にCloud SQL接続エラーが発生する場合に確認

### 優先度3: Vision API権限の確認（実行時エラーが発生した場合）
- OCR機能を使用する際にエラーが発生する場合に確認

## 🔍 次のステップ

1. **Prismaクライアントの問題を修正**（最優先）
2. **ビルドが成功することを確認**
3. **デプロイを実行**
4. **実行時エラーが発生した場合、GCP側の権限を確認**
