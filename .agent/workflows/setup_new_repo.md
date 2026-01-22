---
description: 00_agent_toolbox からテンプレートを展開し、Canon準拠の新規プロジェクト環境を構築する
---

# 新規プロジェクト自動セットアップ

1. **プロジェクトタイプの確認**
   - ユーザーに技術スタック（Node.js/Vite, Python, Godot 等）を確認する。
   - 現在は `Node.js/Vite` のみ対応中。

2. **テンプレートの展開**
   - `00_agent_toolbox/templates/node_vite/` の中身をカレントディレクトリにコピーする。
   - `cp -r ../00_agent_toolbox/templates/node_vite/ .` (隠しファイルも含むこと)

3. **Canon の配置**
   - `mkdir -p docs`
   - `cp ../00_agent_toolbox/universal_project_canon.md docs/`

4. **agent.md の作成**
   - `cp ../00_agent_toolbox/templates/_agent_template.md ./agent.md`
   - `agent.md` の中身をプロジェクト名に合わせて置換する。

5. **依存関係のインストール**
   - `npm install` (または `npm init -y` から始めて `package_scripts.json` の内容をマージ)
   - `git init`, `npx husky init` 等の初期化を実行。

6. **完了確認**
   - `npm run lint` が通るか確認する。
   - ユーザーに「セットアップ完了」を報告する。
