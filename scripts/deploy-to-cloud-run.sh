#!/bin/bash
# scripts/deploy-to-cloud-run.sh
# Cloud Runにデプロイするスクリプト

set -euo pipefail

# gcloudのPATHを設定
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

PROJECT_ID="bizcard-ocr-prod"
REGION="asia-northeast1"
SERVICE_NAME="meishi-api"
REPOSITORY_NAME="meishiocr"  # Artifact Registryリポジトリ名
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Cloud Run デプロイスクリプト ===${NC}"
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

# Artifact Registry APIを有効化
echo -e "${GREEN}Artifact Registry APIを有効化中...${NC}"
gcloud services enable artifactregistry.googleapis.com --project="${PROJECT_ID}" || true

# Cloud Run APIを有効化
echo -e "${GREEN}Cloud Run APIを有効化中...${NC}"
gcloud services enable run.googleapis.com --project="${PROJECT_ID}" || true

# Docker認証設定（Artifact Registry用）
echo -e "${GREEN}Docker認証を設定中...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet || true

# Dockerイメージをビルド
echo -e "${GREEN}Dockerイメージをビルド中...${NC}"
docker build -t "${IMAGE_NAME}" .

# Dockerイメージをプッシュ
echo -e "${GREEN}Dockerイメージをプッシュ中...${NC}"
docker push "${IMAGE_NAME}"

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
