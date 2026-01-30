#!/bin/bash
# ログを確認するスクリプト

echo "=== Next.js開発サーバーのログ確認方法 ==="
echo ""
echo "1. Cursorのターミナルパネルで確認:"
echo "   - Cursor下部の「ターミナル」タブを開く"
echo "   - npm run dev を実行しているターミナルにログが表示されます"
echo ""
echo "2. ブラウザの開発者ツールで確認:"
echo "   - F12キーを押すか、右クリック→検証"
echo "   - 「Console」タブを開く"
echo ""
echo "3. ログファイルに保存する場合:"
echo "   npm run dev 2>&1 | tee logs/dev-$(date +%Y%m%d-%H%M%S).log"
echo ""
echo "現在のログを確認するには、上記の方法を使用してください。"
