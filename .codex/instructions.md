# Instructions

## Core Rules

- まず `agent.md` を読み、リポジトリの役割を理解する
- 変更前に `npm run typecheck` を通す
- 実装前に方針を短く説明する

## Technical Context

- Language: TypeScript (ESM)
- Build: `tsx`
- Validation: `Zod`
- Test: `Vitest`

## Data Safety

- `questions_edit.tsv` は慎重に扱う。既存の ID を勝手に変更しない
- バリデーションエラーが出る場合は `out/questions_ng.json` を確認し修正する
