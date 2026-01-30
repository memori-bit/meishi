# Cloud Runデプロイ準備チェックリスト

## 🚨 現在の状況

### ✅ 完了済み
1. **Secret Managerへの登録**
   - ✅ `google-search-api-key` - 登録済み
   - ✅ `google-search-engine-id` - 登録済み
   - ✅ `nextauth-secret` - 登録済み
   - ✅ `google-service-account-key` - 登録済み

2. **IAM権限**
   - ✅ Secret Manager Secret Accessor権限 - 付与済み

3. **Artifact Registry**
   - ✅ リポジトリ `meishiocr` - 作成済み

### ❌ 未完了（デプロイ前に必須）

#### 1. Cloud SQLインスタンスの作成（最優先）
**現状**: Cloud SQLインスタンスが存在しません

**必要な作業:**
```bash
# 1. Cloud SQL Admin APIを有効化
gcloud services enable sqladmin.googleapis.com --project=bizcard-ocr-prod

# 2. Cloud SQLインスタンスを作成
gcloud sql instances create meishi-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --project=bizcard-ocr-prod \
  --backup-start-time=03:00 \
  --enable-bin-log

# 3. データベースを作成
gcloud sql databases create meishi \
  --instance=meishi-db \
  --project=bizcard-ocr-prod

# 4. ユーザーを作成（パスワードは安全なものを設定）
gcloud sql users create meishi_user \
  --instance=meishi-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=bizcard-ocr-prod
```

**接続文字列の準備:**
```
postgresql://meishi_user:YOUR_PASSWORD@/meishi?host=/cloudsql/bizcard-ocr-prod:asia-northeast1:meishi-db
```

#### 2. DATABASE_URLのSecret Manager登録（最優先）
**現状**: `database-url` Secretが未登録

**必要な作業:**
```bash
# Cloud SQL接続文字列をSecret Managerに登録
echo -n "postgresql://meishi_user:YOUR_PASSWORD@/meishi?host=/cloudsql/bizcard-ocr-prod:asia-northeast1:meishi-db" | \
  gcloud secrets create database-url \
    --project=bizcard-ocr-prod \
    --replication-policy="automatic" \
    --data-file=-
```

#### 3. データベースマイグレーションの実行（必須）
**現状**: テーブルが未作成

**必要な作業:**
```bash
# 方法1: Cloud SQL Proxyを使用（推奨）
# 1. Cloud SQL Proxyをダウンロード・起動
# 2. DATABASE_URLをローカル接続に変更
# 3. npx prisma migrate deploy

# 方法2: Cloud Buildを使用（後で実行可能）
# デプロイ後にCloud Runから実行
```

#### 4. Vision API権限の確認（推奨）
**現状**: 権限が正しく付与されているか未確認

**確認・設定:**
```bash
# 権限を確認
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# 必要に応じて権限を付与
gcloud projects add-iam-policy-binding bizcard-ocr-prod \
  --member="serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --role="roles/ml.developer"
```

#### 5. ローカルビルドの修正（必須）
**現状**: Prismaクライアントのインポートエラーが発生

**必要な作業:**
- Prismaクライアントを再生成
- ローカルで`npm run build`が成功することを確認

### ⚠️ オプション（後で設定可能）

#### OPENAI_API_KEYの登録
- 現在未設定ですが、リサーチ機能はモックデータで動作します
- より正確なリサーチ結果が必要な場合のみ設定

## 📋 準備手順（優先順位順）

### ステップ1: Cloud SQLインスタンスの作成（30分程度）

1. Cloud SQL Admin APIを有効化
2. Cloud SQLインスタンスを作成（db-f1-micro推奨、コスト効率重視）
3. データベースとユーザーを作成
4. 接続文字列を準備

### ステップ2: DATABASE_URLの登録（5分）

1. 接続文字列をSecret Managerに登録
2. Secretが正しく登録されたか確認

### ステップ3: データベースマイグレーション（10分）

1. Cloud SQL Proxyをセットアップ
2. Prismaマイグレーションを実行
3. テーブルが作成されたか確認

### ステップ4: ローカルビルドの確認（5分）

1. Prismaクライアントを再生成
2. `npm run build`が成功することを確認

### ステップ5: デプロイ実行（10-15分）

1. すべての準備が完了したらデプロイスクリプトを実行
2. ビルドとデプロイの完了を待つ
3. サービスURLを確認して動作確認

## 💰 コスト見積もり（MVP版）

- **Cloud SQL (db-f1-micro)**: 約$7-10/月
- **Cloud Run**: リクエスト数に応じて（無料枠あり）
- **Artifact Registry**: ストレージ料金（小規模なら無料枠内）
- **Secret Manager**: 無料
- **Vision API**: 使用量に応じて（1,000リクエスト/月まで無料）
- **Custom Search API**: 1日100リクエストまで無料

**月額見積もり**: 約$10-15（小規模利用の場合）

## 🔗 参考リンク

- [Cloud SQL インスタンス作成ガイド](https://cloud.google.com/sql/docs/postgres/create-instance)
- [Cloud SQL Proxy セットアップ](https://cloud.google.com/sql/docs/postgres/connect-instance-cloud-sql-proxy)
- [Prisma マイグレーション](https://www.prisma.io/docs/concepts/components/prisma-migrate)
