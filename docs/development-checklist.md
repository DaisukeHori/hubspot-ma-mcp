# ツール追加・修正時のチェックリスト

このドキュメントは、hubspot-ma-mcp に新しいツールを追加、または既存ツールのスキーマを変更する際に必ず守るべきルールをまとめたものです。

## 背景

過去に「公式OpenAPI specに合わせず、見たことのある一部プロパティだけスキーマ化していた」ことが原因で、HubSpotから返却されるデータと送信時のデータの間に齟齬が生じ、フォームの通知設定が空のまま作成される等のバグが発生しました。同種のバグを防ぐために、以下の手順を必ず実施してください。

## 1. 公式仕様の取得

HubSpot公式OpenAPI specを `HubSpot/HubSpot-public-api-spec-collection` リポジトリから取得します。

| API カテゴリ | パスパターン |
|---|---|
| Marketing系 | `PublicApiSpecs/Marketing/{API}/Rollouts/{rolloutId}/v3/{api}.json` |
| CRM系 | `PublicApiSpecs/CRM/{API}/Rollouts/...` |
| Automation系 | `PublicApiSpecs/Automation/...` |
| CMS系 | `PublicApiSpecs/CMS/...` |

例:
- Marketing Forms v3: `https://raw.githubusercontent.com/HubSpot/HubSpot-public-api-spec-collection/main/PublicApiSpecs/Marketing/Forms/Rollouts/144909/v3/forms.json`
- Automation v4: `https://raw.githubusercontent.com/HubSpot/HubSpot-public-api-spec-collection/main/PublicApiSpecs/Automation/Automation%20V4/Rollouts/144908/v4/automationV4.json`
- CMS Pages: `https://raw.githubusercontent.com/HubSpot/HubSpot-public-api-spec-collection/main/PublicApiSpecs/CMS/Pages/Rollouts/59888/v3/pages.json`

仕様の取得方法（curl 例）:

```bash
curl -sL "https://raw.githubusercontent.com/HubSpot/HubSpot-public-api-spec-collection/main/PublicApiSpecs/Marketing/Forms/Rollouts/144909/v3/forms.json" -o forms.json
```

## 2. 必須フィールドの完全網羅

仕様の `components.schemas.{SchemaName}.required` に挙げられた **全プロパティ** を、ツールの Zod スキーマ `properties` に必ず定義します。一部だけ実装するのは禁止です。

部分実装すると以下の問題が発生します:

- API 送信時に該当フィールドがリクエストボディに含まれない → HubSpot 側でデフォルト値（空配列・false 等）で上書きされる
- 結果、UI から作成したものと API から作成したものでフォームの挙動が異なる
- 通知メールが誰にも届かない、reCAPTCHA が無効化される、ライフサイクルステージが設定されない、等の事故につながる

**重要**: HubSpot は配列型の必須フィールドが空配列でリクエストに無いと、暗黙的に空配列で初期化します。`notifyRecipients`, `lifecycleStages` 等は特に要注意。

## 3. enum 値の正確さ

仕様の `enum` 値を **一字一句正確にコピー** すること。意訳・推測は禁止です。

過去の事例:
- ❌ `postSubmitAction.type` を `redirect` と書いていた → 正しくは `redirect_url`
- ❌ `displayOptions.theme` の説明文に存在しない `none` を書いていた → 正しくは `["canvas", "default_style", "legacy", "linear", "round", "sharp"]` の6種のみ
- ❌ `embedType` を `z.string()` で曖昧にしていた → 正しくは `z.enum(["V3", "V4"])`

`z.string().optional()` で逃げると、誤った値を投げてもコンパイル時に検出できません。明確に enum 化しましょう。

## 4. テスト

修正後、以下を必ず確認します。

### 4.1 ツールスキーマの確認

```bash
curl -s -X POST "https://hubspot-ma-mcp.vercel.app/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | python3 -c "
import sys, json, re
raw = sys.stdin.read()
if 'data:' in raw[:100]:
    m = re.search(r'data:\s*(.+)', raw, re.S)
    raw = m.group(1) if m else raw
data = json.loads(raw)
for t in data['result']['tools']:
    if t['name'] == '<対象ツール名>':
        print(json.dumps(t['inputSchema'], indent=2, ensure_ascii=False))
        break
"
```

仕様の required と一致しているかをチェック。

### 4.2 実 API での往復テスト

1. ツールでオブジェクト（フォーム、ワークフロー等）を作成
2. 同じツールで作成したオブジェクトを取得（form_get, workflow_get 等）
3. 入力した値とレスポンスをdiffして、欠落・上書きが無いことを確認

特に重要:
- `notifyRecipients`, `lifecycleStages`, `recaptchaEnabled` のような「設定しないとデフォルトで安全側に倒れる」項目を入念にチェック

### 4.3 既存オブジェクトのクローン互換性

実物として動いているフォームやページを `*_get` で取得し、そのレスポンス構造を `*_create` の入力にそのまま入れ直して動くこと（クローンが成立すること）を確認します。

## 5. CIによる自動チェック（将来の課題）

公式 spec を CI で定期取得し、ローカルスキーマとの差分を検出する仕組みを別途検討します。`mcp-doctor` CI に組み込めるとベスト。

## 6. ドキュメント更新

ツールを追加・変更したら、README.md の「ツール一覧」セクションも合わせて更新してください。tool_count（README 冒頭の数値）がずれないよう注意。

## 過去の事例

### 2026-04-28: form_create configuration 12項目補完

「6月セミナー用フォームC」を作成した際、`notifyRecipients` 等が空で作成される事象が発生。当時のスキーマには 4項目しか定義されていなかったため、リクエストボディに含まれず、HubSpot側でデフォルト値（空配列、false）が設定されていた。

修正: コミット `a3b91c4` で12項目すべてを Zod スキーマに追加し、`form_create` と `form_update` で同一スキーマ（`_form-schemas.ts`）を共有する構造に変更。

### 2026-04-28: workflow_batch_read のリクエストボディ修正

`/automation/v4/flows/batch/read` は `{ inputs: [{ flowId, type: "FLOW_ID" }] }` を要求するが、`{ inputs: [{ id }] }` で送っていたため常に 400 エラー。

修正: コミット `eb3de25` で正しい形式に修正。

### 2026-04-28: theme / embedType の enum 化

`displayOptions.theme` および `configuration.embedType` を `z.string()` から `z.enum([...])` に厳密化。

公式仕様:
- `theme.enum`: `["canvas", "default_style", "legacy", "linear", "round", "sharp"]`
- `embedType.enum`: `["V3", "V4"]`

説明文に存在しない `"none"` が記載されていたのを削除。
