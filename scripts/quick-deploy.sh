#!/bin/bash
# scripts/quick-deploy.sh
# クイックデプロイスクリプト（認証とデプロイを一括実行）

set -euo pipefail

PROJECT_ID="bizcard-ocr-prod"
REGION="asia-northeast1"

# gcloudのPATHを設定
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

echo "=== Cloud Run クイックデプロイ ==="
echo ""

# gcloud認証確認
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
  echo "gcloudにログインしてください..."
  gcloud auth login
fi

# プロジェクト設定
gcloud config set project "${PROJECT_ID}" --quiet

# Secret ManagerにAPIキーを登録
echo ""
echo "=== Step 1: Secret ManagerにAPIキーを登録 ==="
chmod +x scripts/push-secrets-to-gcp.sh
./scripts/push-secrets-to-gcp.sh || echo "Secret登録をスキップしました"

# IAM権限を設定
echo ""
echo "=== Step 2: IAM権限を設定 ==="
chmod +x scripts/setup-iam-permissions.sh
./scripts/setup-iam-permissions.sh || echo "IAM権限設定をスキップしました"

# Cloud Runにデプロイ
echo ""
echo "=== Step 3: Cloud Runにデプロイ ==="
chmod +x scripts/deploy-to-cloud-run.sh
./scripts/deploy-to-cloud-run.sh

echo ""
echo "=== デプロイ完了 ==="
