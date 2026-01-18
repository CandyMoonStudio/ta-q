# TypeAnswer Question Management (ta-q)

ゲーム本体で使用する問題データを管理・検証するためのリポジトリです。本リポジトリは「マスタデータの管理（Master Data Management）」と「品質管理（Quality Control）」の役割を担います。

**主な役割:**

- **Check (検証)**: データの整合性チェック、ブラウザでのプレビュー。
- **Classify (分類)**: ステータス（Prod/NG/Inbox）の分類、タグ付け。
- **Add (手動追加)**: 補足的な問題の手動追加・修正。

※ **問題の作成（Generation）について**
問題データの作成自体は、主にローカルのクローズドな環境で行われます。本リポジトリは、そうして作成されたデータの「受け皿」および「整地場所」として機能します。

## Architecture

本プロジェクトは、人間が手動で編集しやすい **TSV (Tab Separated Values)** データをマスターとし、アプリケーションが利用可能な最適化された **JSON** データへ変換するビルドパイプラインを提供します。
また、GitHub Pages 上でインタラクティブなバリデーションチェックリストを提供し、多人数あるいは複数端末での品質確認を容易にします。

- **Master Data**: `questions_edit.tsv` (Human Readable/Editable)
- **Builder**: TypeScript Scripts (Validation, Processing, Weight Calculation)
- **QC Tool**: GitHub Pages Checklist (Interactive Review UI)
- **Artifacts**: `out/questions_prod.json`, `out/questions_ng.json`

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Validation**: Zod
- **Testing**: Vitest
- **Format**: ESM (ECMAScript Modules)

## ワークフロー

1. **編集**: `questions_edit.tsv` に問題を追加・修正します。
2. **ビルド**: `npm run checklist` を実行して、JSON 変換と `docs/index.html` の生成を行います。
3. **デプロイ**: `docs/` フォルダの変更を GitHub にプッシュします。設定後、自動的に GitHub Pages が更新されます。
4. **反映**: 生成された `out/` 配下の JSON ファイルを、ゲーム本体のデータディレクトリにコピーします。

## GitHub Pages での公開方法

1. GitHub リポジトリの **Settings** > **Pages** を開きます。
2. **Build and deployment** > **Branch** で `main` (または作業ブランチ) を選択し、フォルダを `/docs` に設定して **Save** します。
3. これで `https://<username>.github.io/ta-q/` で品質チェックリストが閲覧可能になります。

## セットアップ

```bash
# 依存パッケージのインストール
npm install
```

## 使い方

### ビルド（JSON生成）

```bash
npm run build
```

実行すると `out/` ディレクトリに以下のファイルが生成されます。

- `questions_prod.json`: 本番用データ（`status: prod` のもの）
- `questions_ng.json`: NGデータ（`status: ng` またはバリデーションエラーのもの）
- `report.txt`: 生成結果のサマリー

### バリデーション

ビルド時に以下のチェックが自動的に行われます。エラーがある問題は `questions_ng.json` に出力され、`errors` フィールドに理由が記載されます。

- 必須項目の欠落 (`id`, `text`, `answer`)
- IDの重複
- 問題文と正解の重複（重複登録の防止）

## TSV フォーマット (`questions_edit.tsv`)

データはタブ区切りテキストで管理します。Excel や Google Sheets から貼り付けることも可能です。

| カラム名 | 必須 | 説明 | 例 |
| :--- | :---: | :--- | :--- |
| `id` | ✅ | 問題ID。一意である必要があります。数値推奨ですが文字列も可。 | `1`, `1001` |
| `text` | ✅ | 問題文。 | `日本の首都は？` |
| `answer` | ✅ | 正解（メインの回答）。ディスプレイに表示される解答です。 | `東京` |
| `aliases` | | 別解。パイプ `\|` 区切りで複数指定可。 | `とうきょう\|tokyo` |
| `romaji` | | タイピング用のローマ字正解。 | `nihon no shuto ha ?` |
| `type` | | 問題タイプ。`fast`（早押し）または `knowledge`（知識）など。 | `fast` |
| `tags` | | タグ。整理用。パイプ `\|` 区切り。 | `geo\|japan` |
| `weight` | | 出題確率の重み付け（通常は自動計算されます）。 | `1.0` |
| `status` | | ステータス。`prod`（本番）、`ng`（却下）、`inbox`（下書き）。空欄は `inbox` 扱い。 | `prod` |
| `source` | | 出典や作成元メモ。 | `manual` |
| `explanation` | | 解説文。知識問題などで正解後に表示されます。 | `現在は東京都が事実上の首都です。` |

## ディレクトリ構成

- `src/`: ビルドスクリプトのソースコード
- `out/`: ビルド生成物の出力先（git管理外）
- `questions_edit.tsv`: マスターデータ（編集対象）
- `schema/`: JSONスキーマ定義
