# 本番環境へのデプロイ手順（手動実行）

## 前提条件
- gcloud CLIがインストール済み
- gcloud認証が完了していること

## デプロイコマンド

ターミナルで以下のコマンドを実行してください：

```bash
# 1. プロジェクトディレクトリに移動
cd /Users/nakazatokeita/meishi

# 2. gcloudのPATHを設定
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

# 3. プロジェクトを設定
gcloud config set project bizcard-ocr-prod

# 4. Cloud Buildを使用してビルドとデプロイ（Docker不要）
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/bizcard-ocr-prod/meishiocr/meishi-api \
  --project=bizcard-ocr-prod \
  --region=asia-northeast1

# 5. Cloud Runにデプロイ
gcloud run deploy meishi-api \
  --image asia-northeast1-docker.pkg.dev/bizcard-ocr-prod/meishiocr/meishi-api \
  --region asia-northeast1 \
  --project bizcard-ocr-prod \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-secrets="GOOGLE_SEARCH_API_KEY=google-search-api-key:latest,GOOGLE_SEARCH_ENGINE_ID=google-search-engine-id:latest,OPENAI_API_KEY=openai-api-key:latest,NEXTAUTH_SECRET=nextauth-secret:latest,DATABASE_URL=database-url:latest" \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --service-account="meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com"

# 6. サービスURLを取得
gcloud run services describe meishi-api \
  --region asia-northeast1 \
  --project bizcard-ocr-prod \
  --format="value(status.url)"
```

## 注意事項

- ビルドには5-10分かかる場合があります
- デプロイには2-3分かかる場合があります
- エラーが発生した場合は、エラーメッセージを確認してください
