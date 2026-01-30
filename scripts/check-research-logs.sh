#!/bin/bash
# リサーチログを確認するスクリプト

echo "=== リサーチログ確認 ==="
echo ""

# Next.jsのログファイルを確認
LOG_FILE=".next/dev/logs/next-development.log"

if [ -f "$LOG_FILE" ]; then
    echo "1. Next.js開発ログからリサーチ関連のログを抽出:"
    echo "----------------------------------------"
    tail -200 "$LOG_FILE" | grep -E "(Research|research|Extracting|Adopted|Scoring|Searching|External search|候補|採用)" | tail -50
    echo ""
else
    echo "ログファイルが見つかりません: $LOG_FILE"
    echo ""
fi

echo "2. リアルタイムでログを確認する方法:"
echo "   - Cursorのターミナルパネルで 'npm run dev' を実行しているターミナルを確認"
echo "   - リサーチを実行すると、以下のようなログが表示されます:"
echo ""
echo "   例:"
echo "   - Research API called: { confirmedCompanyName: '...' }"
echo "   - Starting external search..."
echo "   - External search found X candidates"
echo "   - Adopted X candidates (score >= 60)"
echo "   - Extracting business description from X URLs"
echo "   - Business description result: Found/null"
echo ""
echo "3. ブラウザの開発者ツール（F12）のConsoleタブでも確認できます"
echo ""
