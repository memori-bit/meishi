# Cloud SQLセットアップ完了

## ✅ 完了した作業

### 1. Cloud SQLインスタンス
- ✅ インスタンス名: `meishi-db`
- ✅ リージョン: `us-central1`
- ✅ データベースバージョン: PostgreSQL 15
- ✅ ステータス: RUNNABLE

### 2. データベース
- ✅ データベース名: `meishi`
- ✅ 作成完了

### 3. ユーザー
- ✅ ユーザー名: `meishi_user`
- ✅ パスワード: 設定済み（Secret Managerに保存）

### 4. Secret Manager
- ✅ `database-url` Secret登録完了
- ✅ 接続文字列: `postgresql://meishi_user:***@/meishi?host=/cloudsql/bizcard-ocr-prod:us-central1:meishi-db`

### 5. デプロイスクリプト
- ✅ Cloud SQL接続設定を追加（`--add-cloudsql-instances`）

## 📋 次のステップ

### 1. データベースマイグレーションの実行（必須）

Cloud SQL Proxyを使用してローカルからマイグレーションを実行する必要があります。

**手順:**

1. **Cloud SQL Proxyをダウンロード**
   ```bash
   # macOSの場合
   curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
   chmod +x cloud-sql-proxy
   ```

2. **Cloud SQL Proxyを起動（別ターミナル）**
   ```bash
   ./cloud-sql-proxy bizcard-ocr-prod:us-central1:meishi-db
   ```

3. **DATABASE_URLを設定**
   ```bash
   export DATABASE_URL="postgresql://meishi_user:5j9HLo93PgaM3jNeyNJF2#z4@127.0.0.1:5432/meishi"
   ```

4. **マイグレーションを実行**
   ```bash
   npx prisma migrate deploy
   ```

### 2. ローカルビルドの修正（推奨）

Prismaクライアントのエラーを修正します。

```bash
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run build
```

## ⚠️ 注意事項

- Cloud SQLインスタンスは`us-central1`リージョンにあります
- Cloud Runは`asia-northeast1`リージョンにデプロイされます
- 異なるリージョン間の接続は可能ですが、若干のレイテンシが発生する可能性があります
- パフォーマンスを重視する場合は、Cloud SQLインスタンスを`asia-northeast1`に再作成することを検討してください

## 🔍 確認コマンド

```bash
# Cloud SQLインスタンスの確認
gcloud sql instances list --project=bizcard-ocr-prod

# データベースの確認
gcloud sql databases list --instance=meishi-db --project=bizcard-ocr-prod

# ユーザーの確認
gcloud sql users list --instance=meishi-db --project=bizcard-ocr-prod

# Secret Managerの確認
gcloud secrets list --project=bizcard-ocr-prod
```
