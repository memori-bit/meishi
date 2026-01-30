#!/bin/bash
# Firebase 用 6 つのシークレットを Secret Manager に登録する
# .env の NEXT_PUBLIC_FIREBASE_* を使う。プロジェクトルートで実行すること。

set -euo pipefail

PROJECT_ID="bizcard-ocr-prod"
ENV_FILE=".env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "エラー: .env が見つかりません。プロジェクトルートで実行してください。"
  exit 1
fi

echo "=== Firebase 用 Secret Manager 登録 ==="
echo "プロジェクト: ${PROJECT_ID}"
echo ""

set -a
source "${ENV_FILE}"
set +a

create_or_update() {
  local name=$1
  local var=$2
  local val="${!var:-}"
  if [ -z "${val}" ]; then
    echo "⚠ ${var} が未設定のためスキップ: ${name}"
    return 0
  fi
  if gcloud secrets describe "${name}" --project="${PROJECT_ID}" &>/dev/null; then
    echo -n "${val}" | gcloud secrets versions add "${name}" --project="${PROJECT_ID}" --data-file=-
    echo "更新: ${name}"
  else
    echo -n "${val}" | gcloud secrets create "${name}" --project="${PROJECT_ID}" --replication-policy=automatic --data-file=-
    echo "作成: ${name}"
  fi
}

gcloud config set project "${PROJECT_ID}"

create_or_update "next-public-firebase-api-key"          "NEXT_PUBLIC_FIREBASE_API_KEY"
create_or_update "next-public-firebase-auth-domain"      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
create_or_update "next-public-firebase-project-id"       "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
create_or_update "next-public-firebase-storage-bucket"   "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
create_or_update "next-public-firebase-messaging-sender-id" "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
create_or_update "next-public-firebase-app-id"           "NEXT_PUBLIC_FIREBASE_APP_ID"

echo ""
echo "✅ Firebase 用シークレットの登録が完了しました。"
