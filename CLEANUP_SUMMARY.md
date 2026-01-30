# クリーンアップ完了サマリー

## 削除したファイル

以下の不要なファイルを削除しました：

1. **`lib/cleanText.ts`** - 新しい実装では使用されていない
2. **`lib/crawlServicePages.ts`** - 新しい実装では使用されていない
3. **`lib/extractServiceNames.ts`** - 新しい実装では使用されていない
4. **`lib/normalizeProducts.ts`** - 新しい実装では使用されていない
5. **`lib/dummyData.ts`** - 使用されていない
6. **`app/research/page.tsx`** - 古い実装（新しい`/research-result`に置き換え）

## 残っている問題

`app/result/page.tsx`が古いデータ構造（`researchData.company.sections`）を参照しているため、ビルドエラーが発生しています。

### 対応方法

1. **新しいフローを使用する（推奨）**
   - `/upload` → `/source-picker` → `/research-result` の新しいフローを使用

2. **`app/result/page.tsx`を修正する**
   - 新しいAPI形式（`researchData.company.profile`）に対応させる
   - または、このファイルを削除/無効化する

## 使用中のファイル（削除しない）

以下のファイルは使用中です：

- `lib/template.ts` - `/app/api/settings/route.ts`で使用
- `lib/jst.ts` - `/lib/usage.ts`で使用
- `app/result/page.tsx` - 既存のOCRフローから使用されている可能性あり（要修正）
