# HubSpot MA MCP Server — ツールクイックリファレンス

## 🧠 Knowledge Store & Context（5ツール）

| ツール | 用途 | いつ使うか |
|---|---|---|
| `hubspot_knowledge_setup` | 初回セットアップ | Knowledge Store未構築時に1回 |
| `hubspot_knowledge_build` | 既存設定→自動分析→下書き+質問 | 初回オンボーディング時に1回 |
| `hubspot_knowledge_get` | ナレッジ読み込み | **毎回の会話開始時**（必須） |
| `hubspot_knowledge_update` | ナレッジ更新 | 施策実行後、新知見獲得時 |
| `hubspot_context_snapshot` | 現在設定のスナップショット | 施策設計時（必要セクションだけ） |
| `hubspot_marketing_review` | マーケティング実績集計（リード数・メール統計・フォーム・キャンペーン） | goals存在時に毎回、月次レビュー時 |

## 🔧 CRM操作（20ツール）

| オブジェクト | search | get | create | update | delete |
|---|---|---|---|---|---|
| Contacts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Companies | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deals | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tickets | ✅ | ✅ | ✅ | ✅ | ✅ |

## 📝 エンゲージメント（25ツール）

| オブジェクト | search | get | create | update | delete |
|---|---|---|---|---|---|
| Notes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Emails | ✅ | ✅ | ✅ | ✅ | ✅ |
| Meetings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calls | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🔗 関連付け（4ツール）
`association_list` / `association_create` / `association_delete` / `association_labels`

## ⚙️ 設定管理（8ツール）
- Properties: `properties_list` / `property_create` / `property_update` / `property_delete`
- Pipelines: `pipeline_list` / `pipeline_create` / `pipeline_update` / `pipeline_delete`

## 📦 商品・明細・見積（12ツール）
- Products: search/get/create/update/delete
- Line Items: search/get/create/update/delete
- Quotes: search/get（読み取り専用）

## ⚡ ワークフロー（6ツール）
`workflow_list` / `workflow_get` / `workflow_create` / `workflow_update` / `workflow_delete` / `workflow_batch_read`

## 🌐 CMS（4ツール）
`cms_blog_list` / `cms_blog_update` / `cms_page_list` / `cms_page_update`

## 👤 オーナー（2ツール）
`owner_list` / `owner_get`

## 📝 フォーム（5ツール）
`form_list` / `form_get` / `form_create` / `form_update` / `form_delete`

## 📋 リスト/セグメント（7ツール）
`list_create` / `list_search` / `list_get` / `list_delete` / `list_members_get` / `list_members_add` / `list_members_remove`

## 📧 マーケティングメール（7ツール）
`marketing_email_list` / `marketing_email_get` / `marketing_email_create` / `marketing_email_update` / `marketing_email_delete` / `marketing_email_clone` / `marketing_email_publish`

## 📨 Single-Send（2ツール）
`single_send_email` / `single_send_status`

## 🎯 キャンペーン（5ツール）
`campaign_list` / `campaign_get` / `campaign_create` / `campaign_update` / `campaign_asset_associate`

## 📡 カスタムイベント（4ツール）
`custom_event_define` / `custom_event_send` / `custom_event_list_definitions` / `custom_event_get_occurrences`

---

## よく使う組み合わせ

### セミナー施策
```
campaign_create → form_create → list_create(MANUAL)
→ marketing_email_create → campaign_asset_associate（全紐付け）
→ workflow複製確認 → marketing_email_publish（承認後）
→ list_members_add（参加者登録）→ custom_event_send（参加記録）
→ single_send_email（個別フォローアップ）
```

### メール配信
```
list_search（対象リスト確認）→ marketing_email_create → marketing_email_update（配信先設定）
→ marketing_email_publish（承認後）
```

### コンタクト管理
```
contact_search → contact_get → contact_update
→ association_create（会社紐付け）→ note_create（メモ追加）
```
