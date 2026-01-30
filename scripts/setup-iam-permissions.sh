#!/bin/bash
# scripts/setup-iam-permissions.sh
# Cloud Run実行サービスアカウントに必要なIAM権限を設定するスクリプト

set -euo pipefail

PROJECT_ID="bizcard-ocr-prod"
SERVICE_ACCOUNT_EMAIL="meishi-ocr-service@${PROJECT_ID}.iam.gserviceaccount.com"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== IAM権限設定スクリプト ===${NC}"
echo "プロジェクト: ${PROJECT_ID}"
echo "サービスアカウント: ${SERVICE_ACCOUNT_EMAIL}"
echo ""

# Secret Manager Secret Accessor権限を付与
echo -e "${GREEN}Secret Manager Secret Accessor権限を付与中...${NC}"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None

# Vision API User権限を付与（サービスアカウントに直接付与）
echo -e "${GREEN}Vision API User権限を付与中...${NC}"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/ml.developer" || \
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/aiplatform.user" || \
echo -e "${YELLOW}Vision API権限の設定をスキップしました（サービスアカウントが既に適切な権限を持っている可能性があります）${NC}"

echo ""
echo -e "${GREEN}=== IAM権限設定完了 ===${NC}"
