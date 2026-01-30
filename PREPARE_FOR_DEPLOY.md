# Cloud Runデプロイ準備チェックリスト

このドキュメントは、Cloud Runにデプロイする前に準備すべき項目をまとめています。

## 📋 準備項目チェックリスト

### ✅ 1. GCPプロジェクトとリソースの準備

#### 1-1. GCPプロジェクトの確認
- [ ] プロジェクトID: `bizcard-ocr-prod` が存在する
- [ ] プロジェクトにアクセス権限がある
- [ ] 請求が有効になっている

**確認コマンド:**
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud config get-value project
gcloud projects describe bizcard-ocr-prod
```

#### 1-2. Cloud SQLインスタンスの作成（必須）
- [ ] Cloud SQL PostgreSQLインスタンスを作成
- [ ] インスタンス名を記録
- [ ] データベース名を決定（例: `meishi`）
- [ ] ユーザー名とパスワードを設定
- [ ] 接続文字列を準備

**作成手順:**
```bash
# Cloud SQLインスタンスを作成（例）
gcloud sql instances create meishi-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --project=bizcard-ocr-prod

# データベースを作成
gcloud sql databases create meishi \
  --instance=meishi-db \
  --project=bizcard-ocr-prod

# ユーザーを作成
gcloud sql users create meishi_user \
  --instance=meishi-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=bizcard-ocr-prod
```

**接続文字列の形式:**
```
postgresql://meishi_user:YOUR_PASSWORD@/meishi?host=/cloudsql/bizcard-ocr-prod:asia-northeast1:meishi-db
```

#### 1-3. Artifact Registryリポジトリの確認
- [x] リポジトリ名: `meishiocr` が作成済み
- [x] リージョン: `asia-northeast1`
- [x] 形式: Docker

**確認コマンド:**
```bash
gcloud artifacts repositories describe meishiocr \
  --location=asia-northeast1 \
  --project=bizcard-ocr-prod
```

### ✅ 2. APIキーとシークレットの準備

#### 2-1. 必要なAPIキーの確認

| APIキー | 状態 | 説明 |
|---------|------|------|
| `GOOGLE_SEARCH_API_KEY` | ✅ 登録済み | Google Custom Search APIキー |
| `GOOGLE_SEARCH_ENGINE_ID` | ✅ 登録済み | Google Custom Search Engine ID |
| `OPENAI_API_KEY` | ⚠️ 未設定 | OpenAI APIキー（オプション） |
| `NEXTAUTH_SECRET` | ✅ 登録済み | NextAuth.js用シークレット |
| `DATABASE_URL` | ❌ **未登録** | **Cloud SQL接続文字列（必須）** |

#### 2-2. Secret Managerへの登録状況確認

**確認コマンド:**
```bash
gcloud secrets list --project=bizcard-ocr-prod
```

**登録が必要なSecret:**
- [x] `google-search-api-key` - 登録済み
- [x] `google-search-engine-id` - 登録済み
- [x] `nextauth-secret` - 登録済み
- [x] `google-service-account-key` - 登録済み
- [ ] `database-url` - **未登録（必須）**
- [ ] `openai-api-key` - 未登録（オプション）

#### 2-3. DATABASE_URLの登録（必須）

Cloud SQL接続文字列をSecret Managerに登録：

```bash
# 接続文字列を準備（実際の値に置き換える）
DATABASE_URL="postgresql://meishi_user:YOUR_PASSWORD@/meishi?host=/cloudsql/bizcard-ocr-prod:asia-northeast1:meishi-db"

# Secret Managerに登録
echo -n "${DATABASE_URL}" | gcloud secrets create database-url \
  --project=bizcard-ocr-prod \
  --replication-policy="automatic" \
  --data-file=-
```

### ✅ 3. IAM権限の設定

#### 3-1. Cloud Run実行サービスアカウントの確認
- [x] サービスアカウント: `meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com` が存在
- [x] Secret Manager Secret Accessor権限: 付与済み
- [ ] Vision API User権限: 確認が必要

**確認コマンド:**
```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

**必要な権限:**
- [x] `roles/secretmanager.secretAccessor` - Secret ManagerからSecretを読み取る
- [ ] `roles/vision.user` - Vision APIを使用（サービスアカウントに直接付与）

**Vision API権限の付与:**
```bash
gcloud projects add-iam-policy-binding bizcard-ocr-prod \
  --member="serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --role="roles/ml.developer"
```

### ✅ 4. データベースのマイグレーション

#### 4-1. Prismaマイグレーションの実行
- [ ] Cloud SQLに接続してマイグレーションを実行
- [ ] テーブルが正しく作成されているか確認

**マイグレーション手順:**
```bash
# DATABASE_URLを環境変数に設定
export DATABASE_URL="postgresql://meishi_user:YOUR_PASSWORD@/meishi?host=/cloudsql/bizcard-ocr-prod:asia-northeast1:meishi-db"

# Prismaマイグレーションを実行
npx prisma migrate deploy

# または、Cloud SQL Proxyを使用してローカルから実行
# 1. Cloud SQL Proxyを起動
# 2. DATABASE_URLをローカル接続に変更
# 3. npx prisma migrate deploy
```

### ✅ 5. コードの準備

#### 5-1. ビルドエラーの修正
- [x] TypeScriptエラーの修正（`app/dashboard/page.tsx`）
- [x] TypeScriptエラーの修正（`app/settings/page.tsx`）
- [x] `lib/imagePreprocess.ts`の`sharpen`メソッドの修正
- [x] DockerfileのPrismaクライアント生成の修正

#### 5-2. ローカルでのビルド確認
- [ ] ローカルで`npm run build`が成功するか確認

**確認コマンド:**
```bash
npm run build
```

### ✅ 6. デプロイ設定の確認

#### 6-1. デプロイスクリプトの確認
- [x] `scripts/deploy-with-cloud-build.sh` - 作成済み
- [x] Artifact Registryリポジトリ名: `meishiocr` に設定済み
- [x] サービス名: `meishi-api`
- [x] リージョン: `asia-northeast1`

#### 6-2. 環境変数の設定確認
デプロイスクリプトで設定される環境変数：
- [x] `GOOGLE_SEARCH_API_KEY` - Secret参照設定済み
- [x] `GOOGLE_SEARCH_ENGINE_ID` - Secret参照設定済み
- [x] `OPENAI_API_KEY` - Secret参照設定済み
- [x] `NEXTAUTH_SECRET` - Secret参照設定済み
- [ ] `DATABASE_URL` - Secret参照設定済み（Secretが未登録のため要登録）

## 🚨 必須準備項目（デプロイ前に完了必須）

### 1. Cloud SQLインスタンスの作成とDATABASE_URLの登録
**優先度: 最高**

Cloud SQLインスタンスを作成し、接続文字列をSecret Managerに登録してください。

### 2. データベースマイグレーションの実行
**優先度: 最高**

Prismaマイグレーションを実行して、テーブルを作成してください。

### 3. Vision API権限の確認
**優先度: 高**

サービスアカウントにVision API権限が付与されているか確認してください。

## 📝 準備完了後のデプロイ手順

すべての準備が完了したら、以下を実行：

```bash
# 1. デプロイスクリプトを実行
cd /Users/nakazatokeita/meishi
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
./scripts/deploy-with-cloud-build.sh

# 2. デプロイ完了後、サービスURLを確認
gcloud run services describe meishi-api \
  --region asia-northeast1 \
  --project bizcard-ocr-prod \
  --format="value(status.url)"
```

## 🔍 準備状況の確認方法

```bash
# Secret Managerの確認
gcloud secrets list --project=bizcard-ocr-prod

# Cloud SQLインスタンスの確認
gcloud sql instances list --project=bizcard-ocr-prod

# IAM権限の確認
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com"
```
