# Secret Manager 整理 — Firebase 用の追加と未使用の削除

**登録すべき API・Secret を全て書き出した一覧（Key・取得方法・登録コマンド）**: [docs/登録すべきAPI・Secret一覧.md](登録すべきAPI・Secret一覧.md)  
間違えて削除したときの再登録用です。

---

## Firebase 用シークレット一覧（6つ）

| シークレット名 | .env の変数名 |
|----------------|----------------|
| `next-public-firebase-api-key` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `next-public-firebase-auth-domain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `next-public-firebase-project-id` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `next-public-firebase-storage-bucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `next-public-firebase-messaging-sender-id` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `next-public-firebase-app-id` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

---

## 1. Firebase 用シークレットの作成（6つ）

### 方法A: スクリプトで一括登録（推奨）

`.env` に `NEXT_PUBLIC_FIREBASE_*` を設定したうえで、プロジェクトルートで:

```bash
chmod +x scripts/push-firebase-secrets-to-gcp.sh
./scripts/push-firebase-secrets-to-gcp.sh
```

既存シークレットがあれば `versions add` で更新、なければ `create` で新規作成します。

### 方法B: 手動で gcloud 実行

ビルド時に `cloudbuild.yaml` の置換変数で使います。`.env` の `NEXT_PUBLIC_FIREBASE_*` を準備してから、**プロジェクトルートで** 実行してください。

```bash
gcloud config set project bizcard-ocr-prod
set -a && source .env && set +a

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

既に同名がある場合は `gcloud secrets create` はエラーになるので、`gcloud secrets versions add シークレット名 --data-file=-` で更新してください。

---

## 2. 使っているシークレット（残す）

| シークレット名 | 用途 |
|----------------|------|
| `database-url` | Cloud Run の DB 接続 |
| `google-search-api-key` | Google 検索 API キー |
| `google-search-engine-id` | Google 検索エンジン ID |
| `nextauth-secret` | NextAuth 用シークレット |
| `openai-api-key` | OpenAI API キー（利用時） |

これらは **削除しないでください**。

---

## 3. 使っていないシークレット（削除してよい）

添付画像にあったうち、**プロジェクトのコード・cloudbuild で参照していない**ものは次のとおりです。

| シークレット名 | 理由 |
|----------------|------|
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | 使用箇所なし。実際に使うのは `google-search-api-key` |
| `GOOGLE_SEARCH_ENGINE_ID` | 使用箇所なし。実際に使うのは `google-search-engine-id`（小文字） |
| `NEXTAUTH_SECRET` | 使用箇所なし。実際に使うのは `nextauth-secret`（小文字） |

これら 3 つは **削除して問題ありません**。

---

## 4. 未使用シークレットの削除コマンド

```bash
gcloud config set project bizcard-ocr-prod

# 未使用 3 つを削除（確認メッセージに y で応答）
gcloud secrets delete GOOGLE_CUSTOM_SEARCH_API_KEY --project=bizcard-ocr-prod
gcloud secrets delete GOOGLE_SEARCH_ENGINE_ID     --project=bizcard-ocr-prod
gcloud secrets delete NEXTAUTH_SECRET             --project=bizcard-ocr-prod
```

---

## 5. その他（`google-service-account-key`）

- `push-secrets-to-gcp.sh` が `service-account.json` から登録するシークレットです。
- **Cloud Run の `--set-secrets` には含まれておらず**、本番の meishi-api では参照していません。
- ローカル開発や別用途で `GOOGLE_APPLICATION_CREDENTIALS` などに使っている場合だけ残し、**使っていなければ削除してよい**です。

```bash
# 使っていない場合のみ
gcloud secrets delete google-service-account-key --project=bizcard-ocr-prod
```

---

## 6. 整理後のシークレット一覧（想定）

| シークレット名 | 備考 |
|----------------|------|
| `database-url` | 残す |　O K
| `google-search-api-key` | 残す |　N O
| `google-search-engine-id` | 残す |　N O
| `nextauth-secret` | 残す |　N O
| `openai-api-key` | 残す |　O K
| `next-public-firebase-api-key` | 追加（Firebase 用） |
| `next-public-firebase-auth-domain` | 追加（Firebase 用） |
| `next-public-firebase-project-id` | 追加（Firebase 用） |
| `next-public-firebase-storage-bucket` | 追加（Firebase 用） |
| `next-public-firebase-messaging-sender-id` | 追加（Firebase 用） |
| `next-public-firebase-app-id` | 追加（Firebase 用） |
| `google-service-account-key` | 使う場合のみ残す |

---

## 7. Firebase 用シークレットを「書き出し」だけする場合

`gcloud` で作成せず、**値の書き出しだけ**したい場合は、冒頭の **「Firebase 用シークレット一覧（6つ）」** の対応で `.env` からメモしておけばよいです。コンソールの Secret Manager から手動で作成する場合も、同じシークレット名と `.env` の値を登録してください。
