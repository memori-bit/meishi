# 管理者アカウント作成方法

## 方法1: 環境変数を使用（推奨）

`.env`ファイルに以下を追加してください：

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=yourpassword
```

その後、以下のコマンドを実行：

```bash
npm run create-admin
```

## 方法2: コマンドラインで直接指定

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npm run create-admin
```

## デフォルト値

環境変数が設定されていない場合、以下のデフォルト値が使用されます：

- **メールアドレス**: `admin@example.com`
- **パスワード**: `admin123`

⚠️ **セキュリティ警告**: 本番環境では必ず強力なパスワードを設定してください。

## 管理者アカウントの特徴

- **プラン**: EXPO（最高権限）
- **使用制限**: 無制限
- **機能**: すべての機能にアクセス可能

## 既存アカウントの更新

既に同じメールアドレスのアカウントが存在する場合、パスワードとプランが更新されます。
