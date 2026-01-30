# GitHub 登録からデプロイまで — 最初からやる手順

**GitHub アカウント作成** → **リポジトリ作成** → **コードを push** → **GCP に接続して push で自動デプロイ**まで、ゼロから順に書いています。

---

## 目次

| パート | やること |
|--------|----------|
| **A** | GitHub アカウントを作成する |
| **B** | Git をインストールする（未導入の場合） |
| **C** | GitHub にリポジトリを作成する |
| **D** | ローカルの `meishi` を Git で管理し、GitHub に push する |
| **E** | GCP にリポジトリを接続し、push でデプロイする |

**A〜D** が GitHub まわり、**E** は GCP（Cloud Build・Cloud Run）の設定です。  
E の詳細は [DEPLOY_リポジトリ接続手順.md](DEPLOY_リポジトリ接続手順.md) を参照してください。

---

## 前提

- デプロイしたいコードはローカルの **`meishi`** フォルダにある
- GCP プロジェクト **`bizcard-ocr-prod`** を使う
- デプロイ先は **Cloud Run**（`meishi-api`）

---

## A. GitHub アカウントを作成する

1. ブラウザで [https://github.com](https://github.com) を開く。
2. 右上の **Sign up** をクリック。
3. メールアドレス・パスワード・ユーザー名を入力して **Create account**。
4. メール認証（Verify your email）の案内に従い、届いたメールのリンクをクリック。
5. 認証が終わると GitHub にログインした状態になる。

**既にアカウントがある場合**  
→ ログインしている状態で **B** へ進んでください。

---

## B. Git をインストールする（未導入の場合）

Git が入っているか確認：

```bash
git --version
```

`git version 2.x.x` のように表示されれば OK。入っていない場合は以下で導入。

### macOS（Homebrew あり）

```bash
brew install git
```

### macOS（Homebrew なし）

1. [Git for Mac](https://git-scm.com/download/mac) の公式サイトからインストーラーをダウンロード。
2. ダウンロードした `.dmg` を開き、手順に従ってインストール。
3. ターミナルで `git --version` を再度実行して確認。

### Windows

1. [Git for Windows](https://git-scm.com/download/win) からインストーラーをダウンロード。
2. インストール後、コマンドプロンプトまたは PowerShell で `git --version` を確認。

---

## C. GitHub にリポジトリを作成する

1. GitHub にログインした状態で [https://github.com/new](https://github.com/new) を開く。
2. 次のように入力する。

   | 項目 | 入力例 |
   |------|--------|
   | **Repository name** | `meishi`（任意。このあと GCP で選ぶ名前と揃える） |
   | **Description** | 任意（例: 名刺OCRアプリ） |
   | **Public** / **Private** | どちらでも可（GCP は両方対応） |
   | **Add a README file** | ✅ 不要（ローカルに既にあるため） |
   | **Add .gitignore** | ✅ 不要（ローカルに既にあるため） |
   | **Choose a license** | なしでOK |

3. **Create repository** をクリック。
4. 作成後、**「…or push an existing repository from the command line」** のところに表示される  
   `https://github.com/あなたのユーザー名/meishi.git`  
   を控える（あとで `git remote` に使う）。

**Organization でリポジトリを作る場合**  
→ 組織を選んでから上と同様に作成。URL は `https://github.com/組織名/meishi.git` の形になります。

---

## D. ローカルの `meishi` を Git で管理し、GitHub に push する

### D-1. リポジトリがまだ初期化されていない場合

`meishi` フォルダで、まだ `git init` していないとき：

```bash
cd /Users/nakazatokeita/meishi   # 実際のパスに合わせて変更

git init
git branch -M main
git add .
git status   # .env* などが add されていないことを確認（.gitignore で除外される）
git commit -m "Initial commit: meishi app"
```

### D-2. リポジトリがすでに初期化されている場合

```bash
cd /Users/nakazatokeita/meishi

git status   # 未コミットの変更があれば
git add .
git commit -m "Prepare for GitHub deploy"
```

### D-3. GitHub をリモートに追加して push

`あなたのユーザー名` と `meishi` は、C で作ったリポジトリに合わせて書き換えてください。

```bash
git remote add origin https://github.com/あなたのユーザー名/meishi.git
git push -u origin main
```

- 初回 `git push` で GitHub のログインを求められたら、ユーザー名・パスワード（または Personal Access Token）を入力。
- **パスワード**は通常のログイン用ではなく **Personal Access Token (PAT)** を使う必要があります。  
  → GitHub **Settings** → **Developer settings** → **Personal access tokens** でトークンを作成し、パスワードの代わりに貼り付けてください。

push が成功すると、GitHub の `meishi` リポジトリにコードが表示されます。

### D-4. 確認

- GitHub 上で `cloudbuild.yaml` と `Dockerfile` がリポジトリルートにあること。
- `.env` など秘密情報がコミットされていないこと（`.gitignore` で除外されている想定）。

ここまでで **GitHub 登録〜コード push** は完了です。

---

## E. GCP にリポジトリを接続し、push でデプロイする

「GitHub に push するたびに Cloud Build でビルド → Cloud Run にデプロイ」する設定です。

**やることの流れ（詳細は別ドキュメント）：**

1. **Cloud Build に GitHub リポジトリを接続**  
   - Cloud Console → **Cloud Build** → **リポジトリ** → **リポジトリを接続**  
   - **GitHub (Cloud Build GitHub アプリ)** を選び、**C / D** で作成した `meishi` リポジトリを選択して接続。

2. **Secret Manager に Firebase 用の 6 つを登録**  
   - 未登録なら [Secret Manager整理.md](Secret%20Manager整理.md) の手順で登録。

3. **Cloud Build トリガーを作成**  
   - **イベント**: ブランチに push（例: `main`）  
   - **構成**: リポジトリの `cloudbuild.yaml`  
   - **置換変数**: Firebase 用 6 つを Secret 参照で設定。

4. **Cloud Build のサービスアカウントに権限付与**  
   - **Cloud Run 管理者** と **サービス アカウント ユーザー** を付与。

5. **トリガーを手動実行**して初回ビルド＆デプロイ。

6. 以降は **`main` に push するだけで自動デプロイ**。

**くわしい手順・画面ごとの操作・トラブルシューティング**  
→ **[DEPLOY_リポジトリ接続手順.md](DEPLOY_リポジトリ接続手順.md)** の **Step 1〜6** を参照してください。

---

## チェックリスト（GitHub 登録〜初回デプロイ）

- [ ] **A** GitHub アカウントを作成した
- [ ] **B** `git --version` で Git が使えることを確認した
- [ ] **C** GitHub に `meishi` リポジトリを作成した
- [ ] **D** ローカルで `git init`（または既存リポジトリ）→ `commit` → `remote add` → `push` まで完了した
- [ ] **E** [DEPLOY_リポジトリ接続手順.md](DEPLOY_リポジトリ接続手順.md) の Step 1〜5 を実施し、初回ビルドが成功して Cloud Run にデプロイされた

ここまで終われば、**GitHub への push だけでデプロイ**できる状態になっています。
