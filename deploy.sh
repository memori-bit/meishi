#!/bin/bash
# 本番環境へのデプロイスクリプト（手動実行用）
# .env または環境変数に NEXT_PUBLIC_FIREBASE_* を設定してください

set -e

# gcloudのPATHを設定
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

# .env があれば読み込み（Firebase ビルド用）
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo " .env を読み込みました"
fi

PROJECT_ID="bizcard-ocr-prod"
REGION="asia-northeast1"
SERVICE_NAME="meishi-api"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/meishiocr/${SERVICE_NAME}"

echo "=== Cloud Run デプロイ ==="
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo "サービス名: ${SERVICE_NAME}"
echo ""

# プロジェクトを設定
echo "プロジェクトを設定中..."
gcloud config set project "${PROJECT_ID}"

# Firebase ビルド引数（Cloud Build の substitutions に渡す）
SUBST=""
[ -n "${NEXT_PUBLIC_FIREBASE_API_KEY}" ]          && SUBST="${SUBST},_NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}"
[ -n "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" ]      && SUBST="${SUBST},_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"
[ -n "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" ]       && SUBST="${SUBST},_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"
[ -n "${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" ]   && SUBST="${SUBST},_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}"
[ -n "${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" ] && SUBST="${SUBST},_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}"
[ -n "${NEXT_PUBLIC_FIREBASE_APP_ID}" ]           && SUBST="${SUBST},_NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}"
SUBST="${SUBST#,}"  # 先頭のカンマを削除

# Cloud Build でビルド・プッシュ・Cloud Run デプロイまで実行（cloudbuild.yaml にデプロイステップあり）
echo ""
echo "=== Cloud Build 実行（ビルド → プッシュ → Cloud Run デプロイ）==="
if [ -n "${SUBST}" ]; then
  gcloud builds submit --config=cloudbuild.yaml --project="${PROJECT_ID}" --machine-type=e2-highcpu-32 --substitutions="${SUBST}"
else
  gcloud builds submit --config=cloudbuild.yaml --project="${PROJECT_ID}" --machine-type=e2-highcpu-32
fi

echo ""
echo "=== デプロイ完了 ==="
echo ""
echo "サービスURLを取得中..."
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format="value(status.url)")

echo ""
echo "✅ デプロイ完了！"
echo "サービスURL: ${SERVICE_URL}"
echo ""
echo "ダッシュボード: ${SERVICE_URL}/dashboard"
