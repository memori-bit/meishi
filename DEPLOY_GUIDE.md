# 本番環境へのデプロイガイド

## デプロイURL
- **本番環境**: https://meishi-api-mp25fw36la-an.a.run.app
- **ダッシュボード**: https://meishi-api-mp25fw36la-an.a.run.app/dashboard

## デプロイ方法

### 方法1: デプロイスクリプトを使用（推奨）

```bash
cd /Users/nakazatokeita/meishi
./deploy.sh
```

### 方法2: Cloud Buildスクリプトを使用

```bash
cd /Users/nakazatokeita/meishi
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
./scripts/deploy-with-cloud-build.sh
```

## デプロイ手順の詳細

1. **コードの変更をコミット**（必要に応じて）
2. **デプロイスクリプトを実行**
   ```bash
   ./deploy.sh
   ```
3. **ビルドとデプロイの完了を待つ**（5-10分）
4. **サービスURLで動作確認**

## デプロイ設定

- **プロジェクト**: bizcard-ocr-prod
- **リージョン**: asia-northeast1
- **サービス名**: meishi-api
- **メモリ**: 2Gi
- **CPU**: 2
- **タイムアウト**: 300秒
- **最大インスタンス数**: 10

## 環境変数とシークレット

以下のシークレットが自動的に設定されます：
- `GOOGLE_SEARCH_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`

## トラブルシューティング

### デプロイが失敗する場合

1. **gcloud認証を確認**
   ```bash
   export PATH="$HOME/google-cloud-sdk/bin:$PATH"
   gcloud auth list
   ```

2. **プロジェクトを確認**
   ```bash
   gcloud config get-value project
   ```

3. **ログを確認**
   ```bash
   gcloud builds list --limit=5
   gcloud run services logs read meishi-api --region=asia-northeast1 --limit=50
   ```

### ビルドエラーが発生する場合

- `next.config.ts`の設定を確認
- `package.json`の依存関係を確認
- Dockerfileの内容を確認

## 注意事項

- デプロイ中はサービスが一時的に利用できなくなる場合があります
- ビルドには5-10分かかります
- デプロイには2-3分かかります
- エラーが発生した場合は、エラーメッセージを確認してください
