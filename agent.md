# ta-q Codex Agent Guide

## Repository Identity

TypeAnswer の問題データを管理・検証するための MDM (Master Data Management) / QC (Quality Control) リポジトリです。

- **Master Data**: `questions_edit.tsv` (これをマスターとして JSON を生成する)
- **Checklist**: `docs/index.html` (GitHub Pages で動作する検証 UI)
- **Output**: `out/questions_prod.json`, `out/questions_ng.json`

## Guidelines

- このリポジトリは公開前提。機密情報やキー類は記載しない
- `questions_edit.tsv` を編集する際は、フォーマットを守り ID の重複を避ける
- 破壊的変更や大きなリファクタは事前に相談する
- 変更後は必ず `npm run checklist` で整合性を確認する
- localStorage などの永続ストレージは影響範囲を明確にして扱う
