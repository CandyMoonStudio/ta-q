# Workflow

## 1. データの追加・修正

1. `questions_edit.tsv` を編集する
2. `npm run checklist` を実行する
3. `out/report.txt` でエラーがないか確認する

## 2. ビルド・検証ロジックの変更

1. `src/` 配下を修正する
2. `npm run typecheck` を実行する
3. `npm run test` で既存機能が壊れていないか確認する
4. `npm run checklist` で最終出力を確認する

## 3. ガードレール検証

- `npm run guardrail` (全チェック一括実行)

## 確認方法テンプレ

- 実行コマンド:
- 期待結果:
- 代替/手動:
