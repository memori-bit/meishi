# Cloud Run デプロイガイド

このガイドでは、名刺OCRアプリをGCP Cloud Runにデプロイする手順を説明します。

## 前提条件

- GCPプロジェクト: `bizcard-ocr-prod`
- リージョン: `asia-northeast1`
- gcloud CLIがインストールされ、認証済みであること
- Dockerがインストールされていること

## デプロイ手順

### 1. gcloud認証とプロジェクト設定

```bash
# gcloudにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project bizcard-ocr-prod
```

### 2. Secret ManagerにAPIキーを登録

```bash
# スクリプトに実行権限を付与
chmod +x scripts/push-secrets-to-gcp.sh

# Secret Manager APIを有効化（初回のみ）
gcloud services enable secretmanager.googleapis.com

# Secret ManagerにAPIキーを登録
./scripts/push-secrets-to-gcp.sh
```

このスクリプトは以下のSecretを作成/更新します：
- `google-search-api-key` - Google Custom Search APIキー
- `google-search-engine-id` - Google Custom Search Engine ID
- `nextauth-secret` - NextAuth.js用シークレット
- `openai-api-key` - OpenAI APIキー（設定されている場合）
- `google-service-account-key` - サービスアカウントキーJSON

**注意**: `DATABASE_URL`は本番環境のCloud SQL接続文字列に置き換えてから、手動でSecret Managerに登録してください。

```bash
# DATABASE_URLをSecret Managerに登録（例）
echo -n "postgresql://user:password@/dbname?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" | \
  gcloud secrets create database-url \
    --project=bizcard-ocr-prod \
    --replication-policy="automatic" \
    --data-file=-
```

### 3. IAM権限の設定

Cloud Run実行サービスアカウントに必要な権限を付与します：

```bash
# スクリプトに実行権限を付与
chmod +x scripts/setup-iam-permissions.sh

# IAM権限を設定
./scripts/setup-iam-permissions.sh
```

このスクリプトは以下の権限を付与します：
- `roles/secretmanager.secretAccessor` - Secret ManagerからSecretを読み取る
- `roles/vision.user` - Vision APIを使用

### 4. Cloud Runにデプロイ

**推奨: ルートの deploy.sh（Cloud Build 使用）**

```bash
# .env に NEXT_PUBLIC_FIREBASE_* を設定しておく（ビルド時にクライアントに埋め込まれます）
chmod +x deploy.sh
./deploy.sh
```

このスクリプトは以下を実行します：
1. .env を読み込み（あれば）
2. Cloud Build で Docker イメージをビルド（Firebase 環境変数を渡す）
3. Cloud Run にデプロイ（Secret 参照を設定）

**別案: ローカル Docker でビルドする場合**

```bash
chmod +x scripts/deploy-to-cloud-run.sh
./scripts/deploy-to-cloud-run.sh
```

**スマホから使う場合**

1. デプロイ後に表示される **サービスURL**（例: `https://meishi-api-xxxxx-an.a.run.app`）を控えます。
2. **Firebase Console** → 認証 → 設定 → **認証ドメイン** に、そのドメイン（例: `meishi-api-xxxxx-an.a.run.app`）を追加します。
3. スマホのブラウザでサービスURLを開くとログイン・利用ができます。

---

## リポジトリ接続でデプロイする（推奨）

`gcloud builds submit` でローカルをアップロードすると、`.gcloudignore`/`.gitignore` の影響で一部ファイルが含まれないことがあります。**Git リポジトリを Cloud Build に接続**すると、ソースは常にリポジトリの内容になるため、この問題を避けられます。

- **GitHub の登録から教えてほしい** → [docs/GitHub登録からデプロイまで.md](docs/GitHub登録からデプロイまで.md)（アカウント作成・リポジトリ作成・push まで）
- **リポジトリはもう GitHub にある** → [docs/DEPLOY_リポジトリ接続手順.md](docs/DEPLOY_リポジトリ接続手順.md) に Step 1〜6 と、**削除してよい設定・コンテナまわりの整理**をまとめています。

### メリット

- ビルドに使うソースが **Git の内容と一致**する（コミット・push したものだけがビルドされる）
- push で自動ビルド・デプロイ（トリガー設定時）
- 履歴が Cloud Build のログに残る

### 手順概要

1. **リポジトリを GCP に接続**
   - [Cloud Console](https://console.cloud.google.com/) → **Cloud Build** → **リポジトリ**
   - 「リポジトリを接続」→ **GitHub** または **Cloud Source Repositories** を選択
   - 認証して、使うリポジトリ（例: `your-org/meishi`）を選択して接続

2. **Firebase 用の値を Secret Manager に登録（ビルド時の substitutions 用）**
   - 各 `NEXT_PUBLIC_FIREBASE_*` を Secret として作成（例: `next-public-firebase-api-key` など）
   - またはトリガーで「置換変数」を手動設定（Secret を参照する形でも可）

3. **Cloud Build トリガーを作成**
   - Cloud Build → **トリガー** → **トリガーを作成**
   - **イベント**: ブランチに push（例: `main`）
   - **ソース**: 上で接続したリポジトリ・ブランチ
   - **構成**: リポジトリに含まれる `cloudbuild.yaml`
   - **置換変数**:  
     `_NEXT_PUBLIC_FIREBASE_API_KEY` など、cloudbuild で使う変数を設定。  
     Secret に登録した値は「Secret Manager から」を選んで参照

4. **初回または手動でビルド実行**
   - トリガー一覧で「実行」から手動実行、または該当ブランチに push

5. **トリガーで Cloud Run までデプロイする場合**
   - `cloudbuild.yaml` に「Cloud Run へデプロイ」するステップを追加済みです。
   - Cloud Build のデフォルト サービスアカウント（`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`）に **Cloud Run 管理者**（`roles/run.admin`）と **サービスアカウント ユーザー**（`roles/iam.serviceAccountUser`）を付与してください。  
     - IAM → 上記メールを検索 → ロールを追加

リポジトリ接続後は、**コードをコミット・push してから** トリガーでビルド（とデプロイ）が走ります。`types/` やその他のファイルも、リポジトリに含まれていれば確実にビルドに含まれます。

### 5. デプロイ後の確認

デプロイが完了すると、サービスURLが表示されます。ブラウザでアクセスして動作確認してください。

```bash
# サービスURLを取得
gcloud run services describe meishi-api \
  --region asia-northeast1 \
  --project bizcard-ocr-prod \
  --format="value(status.url)"
```

## 環境変数の設定

Cloud Runでは、Secret ManagerのSecretを環境変数として参照するように設定されています：

| 環境変数名 | Secret名 | 説明 |
|-----------|---------|------|
| `GOOGLE_SEARCH_API_KEY` | `google-search-api-key` | Google Custom Search APIキー |
| `GOOGLE_SEARCH_ENGINE_ID` | `google-search-engine-id` | Google Custom Search Engine ID |
| `OPENAI_API_KEY` | `openai-api-key` | OpenAI APIキー |
| `NEXTAUTH_SECRET` | `nextauth-secret` | NextAuth.js用シークレット |
| `DATABASE_URL` | `database-url` | PostgreSQL接続文字列 |

## Vision APIの認証について

現在のコードは`GOOGLE_APPLICATION_CREDENTIALS`環境変数でサービスアカウントキーファイルのパスを指定していますが、Cloud Runではサービスアカウントを直接アタッチする方法が推奨されます。

デプロイスクリプトでは、Cloud Runサービスに`meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com`をアタッチしています。このサービスアカウントには`roles/vision.user`権限が付与されているため、Application Default Credentialsが自動的に使用されます。

もしコードで`GOOGLE_APPLICATION_CREDENTIALS`が必要な場合は、サービスアカウントキーをSecret Managerからファイルとしてマウントする必要があります。

## トラブルシューティング

### Secret ManagerからSecretを読み取れない

Cloud Run実行サービスアカウントに`roles/secretmanager.secretAccessor`権限が付与されているか確認してください：

```bash
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com"
```

### Vision APIが動作しない

サービスアカウントに`roles/vision.user`権限が付与されているか確認してください：

```bash
gcloud projects get-iam-policy bizcard-ocr-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:meishi-ocr-service@bizcard-ocr-prod.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### デプロイが失敗する

ログを確認してください：

```bash
gcloud run services logs read meishi-api \
  --region asia-northeast1 \
  --project bizcard-ocr-prod \
  --limit 50
```

## 更新デプロイ

コードを更新した場合は、再度デプロイスクリプトを実行してください：

```bash
./scripts/deploy-to-cloud-run.sh
```

## コスト最適化

- 最小インスタンス数を0に設定（リクエストがない時は課金なし）
- 最大インスタンス数を適切に設定（過剰なスケールアウトを防ぐ）
- メモリとCPUを必要最小限に設定

現在の設定：
- メモリ: 2Gi
- CPU: 2
- 最大インスタンス数: 10
- タイムアウト: 300秒
