#!/bin/bash
# scripts/push-secrets-to-gcp.sh
# ローカルの.envファイルからSecret Managerへ登録するスクリプト

set -euo pipefail  # エラー時終了、未定義変数エラー、パイプエラー検出

PROJECT_ID="bizcard-ocr-prod"
REGION="asia-northeast1"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GCP Secret Manager 登録スクリプト ===${NC}"
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo ""

# .env ファイルを読み込む
ENV_FILE=".env"
if [ ! -f "${ENV_FILE}" ]; then
  echo -e "${RED}エラー: .env ファイルが見つかりません${NC}"
  exit 1
fi

echo "環境変数ファイル: ${ENV_FILE}"
echo ""

# 環境変数を読み込む（コメントと空行を除外）
set -a
source "${ENV_FILE}"
set +a

# Secret登録関数
create_or_update_secret() {
  local secret_name=$1
  local env_var_name=$2
  local secret_value="${!env_var_name:-}"
  
  if [ -z "${secret_value}" ]; then
    echo -e "${YELLOW}⚠  ${env_var_name} が設定されていません。スキップします。${NC}"
    return 0
  fi
  
  # Secretが存在するかチェック
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" &>/dev/null; then
    echo -e "${YELLOW}既存のSecretを更新: ${secret_name}${NC}"
    # 既存のSecretに新しいバージョンを追加
    echo -n "${secret_value}" | gcloud secrets versions add "${secret_name}" \
      --project="${PROJECT_ID}" \
      --data-file=-
  else
    echo -e "${GREEN}新規Secretを作成: ${secret_name}${NC}"
    # 新規Secretを作成
    echo -n "${secret_value}" | gcloud secrets create "${secret_name}" \
      --project="${PROJECT_ID}" \
      --replication-policy="automatic" \
      --data-file=-
  fi
}

# サービスアカウントキーファイルを読み込む関数
create_service_account_secret() {
  local secret_name="google-service-account-key"
  local sa_file="service-account.json"
  
  if [ ! -f "${sa_file}" ]; then
    echo -e "${YELLOW}⚠  ${sa_file} が見つかりません。スキップします。${NC}"
    return 0
  fi
  
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" &>/dev/null; then
    echo -e "${YELLOW}既存のSecretを更新: ${secret_name}${NC}"
    gcloud secrets versions add "${secret_name}" \
      --project="${PROJECT_ID}" \
      --data-file="${sa_file}"
  else
    echo -e "${GREEN}新規Secretを作成: ${secret_name}${NC}"
    gcloud secrets create "${secret_name}" \
      --project="${PROJECT_ID}" \
      --replication-policy="automatic" \
      --data-file="${sa_file}"
  fi
}

# 各Secretを登録
echo -e "${GREEN}=== Secret登録開始 ===${NC}"
echo ""

create_or_update_secret "google-search-api-key" "GOOGLE_SEARCH_API_KEY"
create_or_update_secret "google-search-engine-id" "GOOGLE_SEARCH_ENGINE_ID"
create_or_update_secret "nextauth-secret" "NEXTAUTH_SECRET"

# OPENAI_API_KEYが設定されている場合のみ登録
if [ -n "${OPENAI_API_KEY:-}" ] && [ "${OPENAI_API_KEY}" != "" ]; then
  create_or_update_secret "openai-api-key" "OPENAI_API_KEY"
else
  echo -e "${YELLOW}⚠  OPENAI_API_KEY が設定されていません。スキップします。${NC}"
fi

# サービスアカウントキーを登録
create_service_account_secret

echo ""
echo -e "${GREEN}=== Secret登録完了 ===${NC}"
echo ""
echo "次のステップ: Cloud Runの環境変数設定を行ってください。"
