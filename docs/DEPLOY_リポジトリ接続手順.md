# リポジトリ接続でデプロイする — 詳細手順

**GitHub に push するだけで Cloud Run にデプロイ**されるようにする手順です。

**GitHub の登録から始めたい場合**  
→ [GitHub登録からデプロイまで.md](GitHub登録からデプロイまで.md) に、アカウント作成・リポジトリ作成・push までまとめています。ここでは **「リポジトリはもう GitHub にある」** 前提で、GCP 接続以降を書きます。

---

## GitHub でデプロイする — やること一覧

| 順番 | やること | 場所 |
|------|----------|------|
| 1 | GitHub リポジトリを GCP に接続 | Cloud Console → Cloud Build → リポジトリ |
| 2 | Firebase 用 Secret を確認（登録済みならスキップ可） | Secret Manager（すでに 6 つ登録済みなら不要） |
| 3 | Cloud Build トリガーを作成（push で発火・`cloudbuild.yaml` 使用） | Cloud Build → トリガー |
| 4 | Cloud Build のサービスアカウントに Cloud Run 権限を付与 | IAM |
| 5 | トリガーを手動実行して初回ビルド＆デプロイ | Cloud Build → トリガー → 実行 |
| 6 | 以降は `main` に push するだけで自動デプロイ | GitHub |

**リポジトリに含めるもの**: `cloudbuild.yaml` と `Dockerfile` がリポジトリルートにあること。これらはすでにプロジェクトに含まれています。

---

## 事前に用意するもの

- GCP プロジェクト: `bizcard-ocr-prod`
- デプロイしたいコードが入っている **GitHub リポジトリ**（例: `your-org/meishi`）
- Firebase の設定値（`.env` にある `NEXT_PUBLIC_FIREBASE_*` の 6 つ）
- すでに Secret Manager に登録済みのもの: `DATABASE_URL`, `database-url` など（既存デプロイで使っているもの）

---

## Step 1: GitHub リポジトリを GCP に接続

1. ブラウザで [Google Cloud Console](https://console.cloud.google.com/) を開く。
2. 左上のプロジェクトで **bizcard-ocr-prod** を選択。
3. 左メニュー（または検索）で **Cloud Build** → **リポジトリ** を開く。
4. **「リポジトリを接続」** をクリック。
5. **ソース** で **GitHub (Cloud Build GitHub アプリ)** を選び **続行**。
6. GitHub の認証画面で **Authorize Google Cloud Build** などを許可する。
7. **組織・リポジトリを選択** で、使う GitHub の組織（またはユーザー）と、リポジトリ（例: `meishi`）を選ぶ。
8. **「リポジトリを接続」** で接続完了。  
   → 一覧に「GitHub (your-org/meishi)」のような名前で表示されれば OK。

---

## Step 2: Firebase 用の値を Secret Manager に登録

トリガーからビルドするとき、Firebase の値は「置換変数」で渡します。値を Secret Manager に入れておくと、トリガーで「Secret を参照」できます。

**※ すでに `next-public-firebase-*` の 6 つを登録済みの場合はこの Step はスキップして Step 3 へ。**

**作成コマンド一覧・未使用シークレットの削除**: [docs/Secret Manager整理.md](Secret%20Manager整理.md) に、Firebase 用 6 つの `gcloud` コマンドと、**使っていないシークレットの削除手順**をまとめています。

1. Cloud Console で **セキュリティ** → **Secret Manager** を開く。
2. **「シークレットを作成」** を 6 回くり返し、次の 6 つを作成する（名前は任意。以下は例）。

| シークレット名（例） | 値（ローカルの .env から） |
|----------------------|----------------------------|
| `next-public-firebase-api-key` | `NEXT_PUBLIC_FIREBASE_API_KEY` の値 |
| `next-public-firebase-auth-domain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` の値 |
| `next-public-firebase-project-id` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` の値 |
| `next-public-firebase-storage-bucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` の値 |
| `next-public-firebase-messaging-sender-id` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` の値 |
| `next-public-firebase-app-id` | `NEXT_PUBLIC_FIREBASE_APP_ID` の値 |

- 各シークレットで「シークレットの値」に、上記の「値」だけを貼り付ける（変数名は入れない）。
- バージョンは「新しいバージョンを追加」で 1 つ作成すればよい。

※ トリガーで「置換変数」を直接入力する運用でもよいが、Secret にしておくと管理しやすい。

---

## Step 3: Cloud Build トリガーを作成

1. **Cloud Build** → **トリガー** を開く。
2. **「トリガーを作成」** をクリック。
3. 次のように設定する。

| 項目 | 入力内容 |
|------|-----------|
| 名前 | 例: `meishi-deploy` |
| リージョン | 例: `global` または `asia-northeast1`（利用可能なリージョンから選択） |
| イベント | **ブランチに push する** |
| ソース | Step 1 で接続したリポジトリ（例: `GitHub (your-org/meishi)`） |
| ブランチ | デプロイしたいブランチ（例: `^main$` または `main`） |
| 構成 | **Cloud Build 構成ファイル（yaml または json）** |
| 場所 | **リポジトリに含まれる** |
| Cloud Build 構成ファイルの場所 | `cloudbuild.yaml`（リポジトリルート） |

4. **「置換変数」** を開く。変数を追加して、Step 2 の Secret を参照する。

- **変数**: `_NEXT_PUBLIC_FIREBASE_API_KEY`  
  **値**: `Secret Manager のシークレット` を選び、`next-public-firebase-api-key` の「最新バージョン」を選択  
  （コンソールによっては「値」の横に「参照」や「Secret」があり、そこから選ぶ）

同様に次の 5 つも追加する:

- `_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` → Secret: `next-public-firebase-auth-domain`
- `_NEXT_PUBLIC_FIREBASE_PROJECT_ID` → Secret: `next-public-firebase-project-id`
- `_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` → Secret: `next-public-firebase-storage-bucket`
- `_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` → Secret: `next-public-firebase-messaging-sender-id`
- `_NEXT_PUBLIC_FIREBASE_APP_ID` → Secret: `next-public-firebase-app-id`

※ コンソールで「Secret を参照」できない場合は、**値** に直接貼り付けでも動きます（非推奨だが動作確認用には可）。

5. **「保存」** でトリガー作成完了。

---

## Step 4: Cloud Build 用サービスアカウントに権限を付与

トリガー実行時に Cloud Run へデプロイするため、Cloud Build のデフォルト サービスアカウントに権限を付けます。

1. **IAM と管理** → **IAM** を開く。
2. **プロジェクト番号** を確認する（ホームのダッシュボードや「プロジェクトの設定」に表示）。
3. メンバー一覧で **`プロジェクト番号@cloudbuild.gserviceaccount.com`** を探す（Cloud Build のデフォルト サービスアカウント）。
4. その行の **編集（鉛筆アイコン）** をクリック。
5. **「別のロールを追加」** で次を追加する。
   - **Cloud Run 管理者**（`roles/run.admin`）
   - **サービス アカウント ユーザー**（`roles/iam.serviceAccountUser`）
6. **保存** する。

---

## Step 5: 初回ビルドの実行

1. **Cloud Build** → **トリガー** を開く。
2. 作成したトリガー（例: `meishi-deploy`）の行で **「実行」** をクリック。
3. ブランチ（例: `main`）を選んで **「実行」**。
4. **履歴** にビルドが表示される。完了するまで待つ（十数分かかることがある）。
5. ステータスが **成功** になれば、Cloud Run にデプロイ済み。
6. **Cloud Run** → サービス **meishi-api** を開き、URL で動作確認する。

---

## Step 6: 以降のデプロイの流れ

- コードを変更したら、**コミット → push** する。
- push したブランチがトリガーの対象（例: `main`）なら、**自動でビルドとデプロイ**が走る。
- 手動でやりたいときは、Step 5 と同様にトリガー一覧から **「実行」** で再実行できる。

---

## リポジトリ接続後に削除してよいもの

「デプロイはリポジトリのトリガーだけ使う」前提で、以下は **削除して問題ありません**。

### 削除してよいファイル・スクリプト

| 対象 | 理由 |
|------|------|
| **`scripts/deploy-to-cloud-run.sh`** | ローカルで Docker ビルドして push するスクリプト。リポジトリ接続後はトリガーがビルドするため不要。 |
| **`scripts/deploy-with-cloud-build.sh`** | 同様にローカルから Cloud Build を叩くスクリプト。トリガーで代替される。 |
| **`scripts/quick-deploy.sh`** | 簡易デプロイ用。トリガー運用なら不要。 |

※ 中身を確認して、自分で「手動デプロイ用」に使っている場合は残してもよい。

### 残しておいてよいもの（推奨）

| 対象 | 理由 |
|------|------|
| **`deploy.sh`（ルート）** | ローカルから「今のディレクトリ」を submit して手動デプロイしたいときに使える。トリガーが主で、手動は補助なら **残す** を推奨。使わないなら削除してよい。 |
| **`cloudbuild.yaml`** | トリガーが参照するため **必須**。削除しない。 |
| **`Dockerfile`** | ビルドで使うため **必須**。削除しない。 |
| **`.dockerignore`** | ビルドコンテキストを減らすため **残す** 推奨。 |

### 設定の整理（やってもよいこと）

- **`.env`**  
  - ローカル開発用はそのまま残してよい。  
  - 本番の Firebase の値は Secret Manager に入れたので、**本番用に .env をリポジトリにコミットする必要はない**（.gitignore のまま）。
- **`scripts/push-secrets-to-gcp.sh`**  
  - Secret Manager に値を登録するときに使う。Firebase 用 Secret を手動で作った場合は必須ではないが、**他の API キー登録用に残しておいてよい**。
- **`scripts/setup-iam-permissions.sh`**  
  - Cloud Run 用サービスアカウントの権限設定用。**残す** 推奨。

---

## コンテナまわりで「削除してよい」設定

- **ローカルでしか使っていない「コンテナでビルドする」ための設定**  
  - 例: 自分用の `docker-compose` でビルドしているだけ、などはリポジトリ接続後はやらなくてよい。  
  - ただし **`docker-compose.yml`** が DB 用（PostgreSQL など）なら、**開発環境用として残す** のが普通。
- **`Dockerfile` / `cloudbuild.yaml`**  
  - Cloud Build と Cloud Run が使うので **削除しない**。
- **`deploy.sh` の「.env を読んで substitutions に渡す」処理**  
  - トリガー運用ではトリガーの置換変数（または Secret）を使うので、**トリガーだけ使うなら deploy.sh ごと使わなくてよい**。  
  - 手動で `./deploy.sh` をたたく運用を残すなら、そのまま残してよい。

---

## トラブルシューティング

- **ビルドは成功するが Cloud Run が更新されない**  
  - IAM で Cloud Build のサービスアカウントに `Cloud Run 管理者` と `サービス アカウント ユーザー` が付いているか再確認。
- **「権限がない」などでデプロイステップが失敗する**  
  - Cloud Build の「履歴」→ そのビルド → **ログ** で、どの権限で失敗しているか確認。
- **Firebase の値がビルドに渡っていない**  
  - トリガーの「置換変数」で、変数名が `_NEXT_PUBLIC_FIREBASE_*` で cloudbuild.yaml の substitutions と一致しているか確認。
- **リポジトリのコードが古い**  
  - デプロイしたいブランチに最新を push したうえで、トリガーを手動「実行」し直す。

---

## 明日のチェックリスト（簡易）

- [ ] Step 1: GitHub リポジトリを Cloud Build に接続した
- [ ] Step 2: Firebase 用の 6 つの Secret を Secret Manager に登録した
- [ ] Step 3: Cloud Build トリガーを作成し、置換変数で上記 Secret を参照した
- [ ] Step 4: Cloud Build のサービスアカウントに Cloud Run 管理者・SA ユーザーを付与した
- [ ] Step 5: トリガーを手動実行してビルドが成功し、Cloud Run にデプロイされた
- [ ] （任意）不要なスクリプト（`deploy-to-cloud-run.sh` など）を削除した

この手順で進めれば、リポジトリ接続によるデプロイと、「削除してよい設定」の整理ができます。
