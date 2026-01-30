#!/bin/bash
# scripts/deploy-with-cloud-build.sh
# Cloud Buildを使用してCloud Runにデプロイするスクリプト（Docker不要）

set -euo pipefail

# gcloudのPATHを設定
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

PROJECT_ID="bizcard-ocr-prod"
REGION="asia-northeast1"
SERVICE_NAME="meishi-api"
REPOSITORY_NAME="meishiocr"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Cloud Build を使用した Cloud Run デプロイスクリプト ===${NC}"
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo "サービス名: ${SERVICE_NAME}"
echo ""

# gcloud認証確認（権限エラーの場合はスキップ）
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
  echo -e "${YELLOW}警告: gcloud認証の確認に失敗しましたが、続行します${NC}"
  echo "認証が完了していることを確認してください"
fi

# プロジェクト設定確認
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "${CURRENT_PROJECT}" != "${PROJECT_ID}" ]; then
  echo -e "${YELLOW}プロジェクトを ${PROJECT_ID} に設定します${NC}"
  gcloud config set project "${PROJECT_ID}"
fi

# 必要なAPIを有効化
echo -e "${GREEN}必要なAPIを有効化中...${NC}"
gcloud services enable artifactregistry.googleapis.com --project="${PROJECT_ID}" || true
gcloud services enable run.googleapis.com --project="${PROJECT_ID}" || true
gcloud services enable cloudbuild.googleapis.com --project="${PROJECT_ID}" || true

# Cloud Buildを使用してビルドとデプロイ
echo -e "${GREEN}Cloud Buildを使用してビルドとデプロイ中...${NC}"
gcloud builds submit --tag "${IMAGE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}"

# Cloud Runにデプロイ
echo -e "${GREEN}Cloud Runにデプロイ中...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-secrets="GOOGLE_SEARCH_API_KEY=google-search-api-key:latest,GOOGLE_SEARCH_ENGINE_ID=google-search-engine-id:latest,OPENAI_API_KEY=openai-api-key:latest,NEXTAUTH_SECRET=nextauth-secret:latest,DATABASE_URL=database-url:latest" \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --service-account="meishi-ocr-service@${PROJECT_ID}.iam.gserviceaccount.com"

echo ""
echo -e "${GREEN}=== デプロイ完了 ===${NC}"
echo ""
echo "サービスURLを取得中..."
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format="value(status.url)")

echo -e "${GREEN}サービスURL: ${SERVICE_URL}${NC}"
