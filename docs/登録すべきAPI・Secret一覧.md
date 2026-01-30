# 登録すべき API・Secret 一覧（Key 付き）

間違えて削除した場合の再登録用です。**Secret Manager の Key（シークレット名）** と **.env の変数名**、**取得方法**を一覧にしています。

---

## 1. Cloud Run で参照している Secret（必須）

`cloudbuild.yaml` の `--set-secrets` で Cloud Run に渡しています。これらが無いと本番が動きません。

| # | Secret Manager の Key<br>（シークレット名） | .env の変数名 | 用途 | 取得方法 |
|---|---------------------------------------------|----------------|------|----------|
| 1 | `database-url` | `DATABASE_URL` | PostgreSQL（Cloud SQL）接続文字列 | Cloud SQL インスタンスの接続情報から作成。<br>例: `postgresql://USER:PASS@/DB?host=/cloudsql/PROJECT:REGION:INSTANCE` |
| 2 | `google-search-api-key` | `GOOGLE_SEARCH_API_KEY` | Google Custom Search API キー | [Google Cloud Console](https://console.cloud.google.com/) → API とサービス → 認証情報 → API キー作成。<br>Custom Search API を有効化。 |
| 3 | `google-search-engine-id` | `GOOGLE_SEARCH_ENGINE_ID` | Google Custom Search の検索エンジン ID | [Programmable Search Engine](https://programmablesearchengine.google.com/) で検索エンジン作成 → 検索エンジン ID をコピー |
| 4 | `nextauth-secret` | `NEXTAUTH_SECRET` | NextAuth.js 用の秘密文字列 | 任意の長いランダム文字列。<br>例: `openssl rand -base64 32` で生成 |
| 5 | `openai-api-key` | `OPENAI_API_KEY` | OpenAI API キー（利用する場合） | [OpenAI API Keys](https://platform.openai.com/api-keys) で作成。<br>使わない場合は Secret 未登録でも可（オプション）。 |

---

## 2. Firebase クライアント用（ビルド時・必須）

ビルド時に `cloudbuild` の置換変数で渡し、クライアント JS に埋め込みます。リポジトリ接続でトリガーからビルドする場合、Secret Manager に登録してトリガーで参照します。

| # | Secret Manager の Key<br>（シークレット名） | .env の変数名 | 用途 | 取得方法 |
|---|---------------------------------------------|----------------|------|----------|
| 6 | `next-public-firebase-api-key` | `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase クライアント API キー | [Firebase Console](https://console.firebase.google.com/) → プロジェクト設定 → 一般 → マイアプリ → 設定 |
| 7 | `next-public-firebase-auth-domain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 認証ドメイン（例: `xxx.firebaseapp.com`） | 同上 |
| 8 | `next-public-firebase-project-id` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID | 同上 |
| 9 | `next-public-firebase-storage-bucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage バケット | 同上 |
| 10 | `next-public-firebase-messaging-sender-id` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM 等メッセージング用 | 同上 |
| 11 | `next-public-firebase-app-id` | `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase アプリ ID | 同上 |

---

## 3. Firebase Admin 用（任意・カスタム認証時）

`lib/firebaseAdmin.ts` で参照。**現在の Cloud Run の `--set-secrets` には含まれていません**。  
サービスアカウントで Firebase Admin を明示的に初期化する場合は、これらを Secret に登録し、Cloud Run の環境変数／Secret 参照に追加する必要があります。

| # | Secret Manager の Key<br>（例） | .env の変数名 | 用途 | 取得方法 |
|---|----------------------------------|----------------|------|----------|
| 12 | `firebase-project-id` | `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID | Firebase Console → プロジェクト設定 |
| 13 | `firebase-client-email` | `FIREBASE_CLIENT_EMAIL` | サービスアカウントのメール | Firebase → プロジェクト設定 → サービスアカウント → キー生成 → JSON 内の `client_email` |
| 14 | `firebase-private-key` | `FIREBASE_PRIVATE_KEY` | サービスアカウントの秘密鍵 | 上記 JSON の `private_key`。改行は `\n` のままで登録可 |

※ 未設定時は `initializeApp()` のみ呼ばれ、デフォルト credential にフォールバックします。多くの場合は 1〜2 の Secret だけで足ります。

---

## 4. その他（任意）

| # | Secret Manager の Key | .env / 元 | 用途 | 取得方法 |
|---|------------------------|-----------|------|----------|
| 15 | `google-service-account-key` | `service-account.json` の中身 | GCP サービスアカウント鍵 JSON（ローカル Vision API 等） | IAM → サービスアカウント → キー作成 → JSON。**Cloud Run の --set-secrets には未使用。** ローカル用なら残す。 |

---

## 5. 登録コマンド早見（1〜5, 6〜11）

`.env` に 1〜5 と 6〜11 の変数を入れた状態で、**プロジェクトルート**で実行してください。

```bash
gcloud config set project bizcard-ocr-prod
set -a && source .env && set +a
```

### 1〜5（Cloud Run 用）

```bash
# database-url（接続文字列は本番用に書き換える）
echo -n "${DATABASE_URL}" | gcloud secrets create database-url \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-

# google-search-api-key
echo -n "${GOOGLE_SEARCH_API_KEY}" | gcloud secrets create google-search-api-key \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-

# google-search-engine-id
echo -n "${GOOGLE_SEARCH_ENGINE_ID}" | gcloud secrets create google-search-engine-id \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-

# nextauth-secret
echo -n "${NEXTAUTH_SECRET}" | gcloud secrets create nextauth-secret \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-

# openai-api-key（使う場合のみ）
echo -n "${OPENAI_API_KEY}" | gcloud secrets create openai-api-key \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
```

既に同名の Secret がある場合は、`gcloud secrets create` はスキップし、`gcloud secrets versions add シークレット名 --data-file=-` で更新します。

### 6〜11（Firebase クライアント用）

```bash
# スクリプトで一括
chmod +x scripts/push-firebase-secrets-to-gcp.sh
./scripts/push-firebase-secrets-to-gcp.sh
```

または手動で 6 つ:

```bash
echo -n "${NEXT_PUBLIC_FIREBASE_API_KEY}" | gcloud secrets create next-public-firebase-api-key \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
echo -n "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" | gcloud secrets create next-public-firebase-auth-domain \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
echo -n "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" | gcloud secrets create next-public-firebase-project-id \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
echo -n "${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" | gcloud secrets create next-public-firebase-storage-bucket \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
echo -n "${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" | gcloud secrets create next-public-firebase-messaging-sender-id \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
echo -n "${NEXT_PUBLIC_FIREBASE_APP_ID}" | gcloud secrets create next-public-firebase-app-id \
  --project=bizcard-ocr-prod --replication-policy=automatic --data-file=-
```

---

## 6. .env の変数名 ↔ Secret Key 対応（コピー用）

| .env の変数名 | Secret Manager の Key |
|----------------|------------------------|
| `DATABASE_URL` | `database-url` |
| `GOOGLE_SEARCH_API_KEY` | `google-search-api-key` |
| `GOOGLE_SEARCH_ENGINE_ID` | `google-search-engine-id` |
| `NEXTAUTH_SECRET` | `nextauth-secret` |
| `OPENAI_API_KEY` | `openai-api-key` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `next-public-firebase-api-key` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `next-public-firebase-auth-domain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `next-public-firebase-project-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `next-public-firebase-storage-bucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `next-public-firebase-messaging-sender-id` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `next-public-firebase-app-id` |

---

## 7. 既存スクリプトでの一括登録

- **1〜5 のうち検索・NextAuth・OpenAI**: `./scripts/push-secrets-to-gcp.sh`（`.env` に `DATABASE_URL` 等を設定したうえで実行）
- **6〜11（Firebase）**: `./scripts/push-firebase-secrets-to-gcp.sh`
- **`database-url`**: 接続文字列が本番用なので、多くの場合は手動で `gcloud secrets create` / `versions add` して登録。
