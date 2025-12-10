# Discord AI Utility Bot

Node.js で動作する Discord 向けの多機能 AI ボットです。  
通常の会話に加えて、URL からイベント情報を抽出してカレンダー登録したり、Web ページの内容を要約したりできます。

---

## ✨ 機能一覧

ユーザーから見える主な機能は以下の 3 つです。

### 1. 通常の会話

チャンネルまたは DM でボットに話しかけると、OpenAI API を使って自然な日本語で返答します。

### 2. URL からイベント情報を抜き出しカレンダー登録

イベントページの URL を渡すと、Dify ワークフロー経由で日時・タイトル・場所などを解析し、カレンダー登録用の情報を生成します。

### 3. URL から Web ページを要約

記事やドキュメントの URL を渡すと、Dify の要約用 API を呼び出し、ページ内容の要約を返します。

> ※ 実際のトリガー（コマンド名やメッセージ形式）は、コードの実装に合わせて適宜書き換えてください。

---

## 必要なもの

- Node.js v18 以上（20 推奨）
- npm（または pnpm / yarn）
- Discord アカウント
- Discord Bot Token（後述）
- OpenAI API キー
- Dify の各種 API キー / ワークフロー URL

---

## 環境変数（.env）の設定

プロジェクト直下に `.env` ファイルを作成し、以下を設定します。

```env
# Discord bot
DISCORD_BOT_TOKEN=

# OpenAI
OPENAI_API_KEY=

# Dify
DIFY_WORKFLOW_URL=
DIFY_PAGE_SUMMARY_API_KEY=
DIFY_CALENDAR_API_KEY=
```

各項目の意味：

- `DISCORD_BOT_TOKEN`  
  - Discord Developer Portal で作成した Bot のトークン。
- `OPENAI_API_KEY`  
  - 通常会話に使用する OpenAI の API キー。
- `DIFY_WORKFLOW_URL`  
  - イベント情報抽出やカレンダー連携などに使う Dify ワークフローのエンドポイント URL。
- `DIFY_PAGE_SUMMARY_API_KEY`  
  - Web ページ要約用に使用する Dify プロジェクトの API キー。
- `DIFY_CALENDAR_API_KEY`  
  - カレンダー登録に使用する Dify プロジェクトの API キー（ワークフローを分けている場合など）。

> ※ 公開リポジトリに `.env` を絶対に含めないでください。

---

## Dify ワークフローのインポート

- リポジトリ内の `dify/` フォルダに、このボット用の Dify ワークフローファイルを同梱しています。
- Dify ポータルでワークフローのインポート機能から、`dify/` 内のファイルをアップロードすると、同じワークフローをそのまま利用できます。
- ただし、API キー（Dify プロジェクトの API キーや連携先サービスの認証情報）は、各自で取得・設定してください。

---

## Discord Bot の作成手順

1. Discord Developer Portal を開く  
   https://discord.com/developers/applications
2. 「New Application」からアプリケーションを作成  
   - 名前は任意（例：`ai-utility-bot`）。
3. 左メニューの「Bot」→「Add Bot」をクリックして Bot を作成。
4. 「Reset Token」から Token をコピーし、`.env` の `DISCORD_BOT_TOKEN` に設定。
5. 同じ画面で「Privileged Gateway Intents」を有効化：
   - `PRESENCE INTENT`
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`（メッセージ内容を読むのに必須）
6. 左メニューの「OAuth2 → URL Generator」で以下を設定：
   - `bot` と `applications.commands` をチェック
   - 「Bot Permissions」から必要な権限（メッセージ閲覧・送信など）をチェック
7. 生成された URL からボットを自分のサーバに招待。

---

## ローカル環境でのセットアップ

1. リポジトリをクローン

   ```bash
   git clone <このリポジトリのURL>
   cd <クローンしたフォルダ>
   ```

2. 依存パッケージのインストール

   ```bash
   npm install
   ```

3. `.env` を作成し、前述の環境変数を設定。
4. ボットを起動

   ```bash
   npm run start
   ```

コンソールに「Bot logged in」などのログが出て、Discord 側でオンラインになれば成功です。

---

## ☁️ Railway にデプロイする場合（常時起動）

1. GitHub にこのリポジトリをプッシュする。
2. Railway にログインし、「New Project → Deploy from GitHub Repo」でこのリポジトリを選択。
3. `Variables` タブで以下を追加：
   - `DISCORD_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `DIFY_WORKFLOW_URL`
   - `DIFY_PAGE_SUMMARY_API_KEY`
   - `DIFY_CALENDAR_API_KEY`
4. `Start Command` が `npm run start` になっていることを確認する。
5. Deploy を実行すると、コンテナが立ち上がり、Discord ボットが常時オンラインになります。

コードを更新したら GitHub に push するだけで、自動的に再デプロイされます（Auto Deploy が ON の場合）。

---

## 使い方（ユーザー視点のざっくりしたイメージ）

> ※ 実際のコマンド名・トリガー文言はコードに合わせて書き換えてください。

### 通常の会話

- ボットが参加しているテキストチャンネルでメンションを付けて話しかける
- もしくは特定のプレフィックス（例：`!ask`）でメッセージを送ると、AI が返答します。

### URL → イベント情報 → カレンダー登録

- イベントページの URL を含むメッセージを送ると、Bot が Dify ワークフローを呼び出し、日時・タイトルなどを解析してカレンダー登録（または登録用の情報を返信）します。

### URL → Web ページ要約

- 記事やドキュメントの URL を含むメッセージを送ると、Dify の要約 API を通じてページ内容をまとめた要約が返信されます。

---

## ⚠️ 注意事項

- 各種 API キーは絶対に公開しないでください。
- 無料枠の制限（OpenAI / Dify / Railway など）を超えると料金が発生する可能性があります。
- 大規模サーバでの運用や商用利用を行う場合は、各サービスの利用規約と料金を必ず確認してください。

