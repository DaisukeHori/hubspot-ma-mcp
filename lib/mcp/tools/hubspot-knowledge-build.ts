import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";
const KNOWLEDGE_EMAIL = "mcp-knowledge@system.internal";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

interface WorkflowSummary { id: string; name: string; isEnabled: boolean; objectTypeId?: string; }
interface PropertySummary { name: string; label: string; type: string; fieldType: string; groupName: string; description?: string; options?: Array<{ label: string; value: string }>; }
interface PipelineSummary { id: string; label: string; stages: Array<{ id: string; label: string; displayOrder: number }>; }
interface FormSummary { id: string; name: string; formType: string; }
interface ListSummary { listId: string; name: string; processingType: string; objectTypeId: string; size?: string; }
interface EmailSummary { id: string; name: string; subject?: string; state: string; type?: string; }

export function registerHubspotKnowledgeBuild(server: McpServer) {
  server.tool(
    "hubspot_knowledge_build",
    `HubSpot の既存設定を自動分析し、Knowledge Store の10カテゴリ全てに下書きを生成する「初期学習モード」。

実行内容:
1. HubSpotの全設定をスナップショット取得（プロパティ・WF・パイプライン・フォーム・リスト・メール等）
2. 設定データからAIが読み取れる事実を10カテゴリに自動分類・言語化
3. AIだけでは判断できない「質問リスト」を生成（設計意図・暗黙のルール等）
4. 下書きをKnowledge Storeに保存
5. 質問リストを返却 → ユーザーが回答 → hubspot_knowledge_updateで追記

初回のオンボーディング時に1回実行。既存のknowledgeがある場合はスキップするかforceで上書き。
Knowledge Storeのセットアップ（hubspot_knowledge_setup）がまだの場合は自動実行される。

所要時間: 30秒〜1分（API呼び出し回数が多いため）。`,
    {
      force: z.boolean().optional().describe("既存のknowledgeを上書きするか（デフォルト false。trueにすると既存の下書きを全て上書き）"),
    },
    async ({ force }) => {
      try {
        const headers = getHeaders();

        // ========== 1. データ収集 ==========

        // カスタムプロパティ
        const customProps: Record<string, PropertySummary[]> = {};
        for (const obj of ["contacts", "companies", "deals", "tickets"]) {
          try {
            const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
              `${BASE_URL}/crm/v3/properties/${obj}`, { method: "GET", headers }
            );
            customProps[obj] = data.results
              .filter((p) => !(p.hubspotDefined as boolean))
              .map((p) => ({
                name: p.name as string, label: p.label as string, type: p.type as string,
                fieldType: p.fieldType as string, groupName: p.groupName as string,
                description: p.description as string | undefined,
                options: p.options as Array<{ label: string; value: string }> | undefined,
              }));
          } catch { customProps[obj] = []; }
        }

        // ワークフロー
        let workflows: WorkflowSummary[] = [];
        try {
          const data = await fetchJson<{ flows: Array<Record<string, unknown>> }>(
            `${BASE_URL}/automation/v4/flows`, { method: "GET", headers }
          );
          workflows = (data.flows || []).map((f) => ({
            id: f.id as string, name: f.name as string,
            isEnabled: f.isEnabled as boolean, objectTypeId: f.objectTypeId as string,
          }));
        } catch { /* ignore */ }

        // パイプライン
        const pipelines: Record<string, PipelineSummary[]> = {};
        for (const obj of ["deals", "tickets"]) {
          try {
            const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
              `${BASE_URL}/crm/v3/pipelines/${obj}`, { method: "GET", headers }
            );
            pipelines[obj] = data.results.map((p) => ({
              id: p.id as string, label: p.label as string,
              stages: (p.stages as Array<Record<string, unknown>>).map((s) => ({
                id: s.id as string, label: s.label as string, displayOrder: s.displayOrder as number,
              })),
            }));
          } catch { pipelines[obj] = []; }
        }

        // フォーム
        let forms: FormSummary[] = [];
        try {
          const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/marketing/v3/forms?limit=100`, { method: "GET", headers }
          );
          forms = (data.results || []).map((f) => ({
            id: f.id as string, name: f.name as string, formType: f.formType as string,
          }));
        } catch { /* ignore */ }

        // リスト
        let lists: ListSummary[] = [];
        try {
          const data = await fetchJson<{ lists: Array<Record<string, unknown>> }>(
            `${BASE_URL}/crm/v3/lists/search`, { method: "POST", headers, body: JSON.stringify({}) }
          );
          lists = (data.lists || []).map((l) => ({
            listId: l.listId as string, name: l.name as string,
            processingType: l.processingType as string, objectTypeId: l.objectTypeId as string,
            size: (l.additionalProperties as Record<string, string>)?.hs_list_size,
          }));
        } catch { /* ignore */ }

        // マーケティングメール
        let emails: EmailSummary[] = [];
        try {
          const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/marketing/v3/emails?limit=50`, { method: "GET", headers }
          );
          emails = (data.results || []).map((e) => ({
            id: e.id as string, name: e.name as string, subject: e.subject as string,
            state: e.state as string, type: e.type as string,
          }));
        } catch { /* ignore */ }

        // オーナー
        let owners: Array<{ id: string; email: string; name: string }> = [];
        try {
          const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/crm/v3/owners?limit=100`, { method: "GET", headers }
          );
          owners = (data.results || []).map((o) => ({
            id: o.id as string, email: o.email as string,
            name: `${o.firstName || ""} ${o.lastName || ""}`.trim(),
          }));
        } catch { /* ignore */ }

        // ========== 2. 下書き生成 ==========

        const totalCustomProps = Object.values(customProps).reduce((sum, arr) => sum + arr.length, 0);
        const enabledWFs = workflows.filter((w) => w.isEnabled).length;
        const disabledWFs = workflows.filter((w) => !w.isEnabled).length;

        const drafts: Record<string, string> = {};
        const questions: string[] = [];

        // --- design_decisions ---
        const ddLines: string[] = ["## 設計判断（自動検出）\n"];
        if (pipelines.deals?.length) {
          ddLines.push(`### パイプライン構成`);
          ddLines.push(`- 取引パイプライン: ${pipelines.deals.length}本（${pipelines.deals.map((p) => `「${p.label}」${p.stages.length}ステージ`).join("、")}）`);
          if (pipelines.deals.length === 1) {
            questions.push("[design_decisions] 取引パイプラインが1本のみです。複数の営業プロセスを1本で管理している理由はありますか？（例: 事業が単一、意図的にシンプルにしている等）");
          }
        }
        if (pipelines.tickets?.length) {
          ddLines.push(`- チケットパイプライン: ${pipelines.tickets.length}本`);
        } else {
          ddLines.push(`- チケットパイプライン: 未使用`);
          questions.push("[design_decisions] チケット（サポート）パイプラインが未使用です。問い合わせ管理はどのように行っていますか？（カスタムプロパティ、外部ツール、使う予定なし等）");
        }
        ddLines.push(`\n### 規模感`);
        ddLines.push(`- カスタムプロパティ: ${totalCustomProps}件（contacts: ${customProps.contacts?.length || 0}, companies: ${customProps.companies?.length || 0}, deals: ${customProps.deals?.length || 0}, tickets: ${customProps.tickets?.length || 0}）`);
        ddLines.push(`- ワークフロー: ${workflows.length}件（有効: ${enabledWFs}, 無効: ${disabledWFs}）`);
        ddLines.push(`- フォーム: ${forms.length}件`);
        ddLines.push(`- リスト/セグメント: ${lists.length}件`);
        ddLines.push(`- マーケティングメール: ${emails.length}件`);
        ddLines.push(`- オーナー（担当者）: ${owners.length}名`);
        questions.push("[design_decisions] このアカウントの主な用途は何ですか？（MA中心、営業管理中心、カスタマーサポート、統合利用等）");
        questions.push("[design_decisions] ライフサイクルステージはどこまで運用していますか？（例: subscriber→lead→customerの3段階のみ、全段階フル活用等）");
        drafts.design_decisions = ddLines.join("\n");

        // --- naming_conventions ---
        const ncLines: string[] = ["## 命名規則（自動検出）\n"];
        if (workflows.length > 0) {
          const wfNames = workflows.slice(0, 10).map((w) => w.name);
          ncLines.push(`### ワークフロー名のサンプル`);
          wfNames.forEach((n) => ncLines.push(`- ${n}`));
        }
        if (forms.length > 0) {
          ncLines.push(`\n### フォーム名のサンプル`);
          forms.slice(0, 10).forEach((f) => ncLines.push(`- ${f.name}`));
        }
        if (lists.length > 0) {
          ncLines.push(`\n### リスト名のサンプル`);
          lists.slice(0, 10).forEach((l) => ncLines.push(`- ${l.name}`));
        }
        questions.push("[naming_conventions] 上記の名前にルールやパターンはありますか？（例: [目的]_[対象]_[YYYYMM] 等）意図的な命名規則があれば教えてください。なければ「特にない」でOKです。");
        drafts.naming_conventions = ncLines.join("\n");

        // --- property_annotations ---
        const paLines: string[] = ["## カスタムプロパティ一覧（自動検出）\n"];
        for (const [obj, props] of Object.entries(customProps)) {
          if (props.length === 0) continue;
          paLines.push(`### ${obj}`);
          props.forEach((p) => {
            const optStr = p.options?.length ? ` [選択肢: ${p.options.map((o) => o.label).join(", ")}]` : "";
            paLines.push(`- **${p.name}** (${p.label}) — ${p.type}/${p.fieldType}${optStr}${p.description ? ` — ${p.description}` : ""}`);
            paLines.push(`  - 用途: ？　更新方法: ？　触っていいか: ？`);
          });
        }
        if (totalCustomProps > 0) {
          questions.push(`[property_annotations] カスタムプロパティが${totalCustomProps}件あります。特に重要なもの（WFで自動更新されるもの、手動変更禁止のもの等）があれば教えてください。`);
        }
        drafts.property_annotations = paLines.join("\n");

        // --- workflow_annotations ---
        const waLines: string[] = ["## ワークフロー一覧（自動検出）\n"];
        workflows.forEach((w) => {
          const status = w.isEnabled ? "🟢 有効" : "🔴 無効";
          waLines.push(`- **${w.name}** (ID: ${w.id}) — ${status}`);
          waLines.push(`  - 目的: ？　テンプレート/個別: ？　触っていいか: ？`);
        });
        if (workflows.length > 0) {
          questions.push(`[workflow_annotations] ワークフローが${workflows.length}件あります。特に重要なもの（標準テンプレートとして使い回すもの、触ってはいけないもの）を教えてください。`);
          if (disabledWFs > 0) {
            questions.push(`[workflow_annotations] 無効なワークフローが${disabledWFs}件あります。これらは不要なもの？一時停止中？削除していいもの？`);
          }
        }
        drafts.workflow_annotations = waLines.join("\n");

        // --- playbooks ---
        const pbLines: string[] = ["## 施策パターン（要入力）\n"];
        pbLines.push("以下の施策タイプについて、標準的な実行手順があれば記述してください。\n");
        pbLines.push("### セミナー/イベント施策\n手順: （未入力）\n");
        pbLines.push("### ニュースレター/定期配信\n手順: （未入力）\n");
        pbLines.push("### 新規リード獲得キャンペーン\n手順: （未入力）\n");
        pbLines.push("### 顧客オンボーディング\n手順: （未入力）\n");
        questions.push("[playbooks] 定期的に繰り返している施策はありますか？（セミナー、ニュースレター、キャンペーン等）あれば「いつもこういう手順でやっている」を教えてください。");
        drafts.playbooks = pbLines.join("\n");

        // --- guardrails ---
        const grLines: string[] = ["## 禁止事項・注意事項（要入力）\n"];
        grLines.push("### 削除禁止\n- （未入力: 削除してはいけないリスト・WF・プロパティがあれば記述）\n");
        grLines.push("### 変更禁止\n- （未入力: 変更してはいけないパイプラインステージ・プロパティ設定があれば記述）\n");
        grLines.push("### 配信ルール\n- （未入力: メール配信の頻度制限・除外ルールがあれば記述）\n");
        questions.push("[guardrails] 「これだけは触るな / 変えるな / 削除するな」というものはありますか？");
        questions.push("[guardrails] メール配信の頻度制限やサプレッションルールはありますか？（例: 週1回まで、特定セグメントには送らない等）");
        drafts.guardrails = grLines.join("\n");

        // --- history ---
        drafts.history = "## 過去施策の記録\n\n（施策実行後にhubspot_knowledge_update mode=appendで自動追記されます）\n";

        // --- contacts_segments ---
        const csLines: string[] = ["## セグメント戦略（自動検出）\n"];
        if (lists.length > 0) {
          csLines.push(`### 既存リスト/セグメント（${lists.length}件）`);
          lists.forEach((l) => {
            csLines.push(`- **${l.name}** — ${l.processingType} / メンバー${l.size || "?"}件`);
          });
        }
        questions.push("[contacts_segments] 主要なコンタクトセグメントは何ですか？（例: 見込み客、既存顧客、VIP、休眠顧客等）どのセグメントにどんな施策を打ちますか？");
        drafts.contacts_segments = csLines.join("\n");

        // --- brand_voice ---
        const bvLines: string[] = ["## ブランドボイス・文体ルール（要入力）\n"];
        bvLines.push("### メール件名フォーマット\n- （未入力: 例: 【レヴォル】○○のご案内）\n");
        bvLines.push("### 本文のトーン\n- （未入力: フォーマル / カジュアル / 使い分け基準）\n");
        bvLines.push("### 禁止表現\n- （未入力）\n");
        bvLines.push("### CTA定型文\n- （未入力）\n");
        bvLines.push("### フッター定型\n- （未入力）\n");
        if (emails.length > 0) {
          bvLines.push(`\n### 既存メール件名サンプル`);
          emails.filter((e) => e.subject).slice(0, 10).forEach((e) => {
            bvLines.push(`- ${e.subject} (${e.state})`);
          });
        }
        questions.push("[brand_voice] メールの件名にルールはありますか？（例: 必ず【会社名】を入れる等）本文はフォーマル？カジュアル？");
        drafts.brand_voice = bvLines.join("\n");

        // --- integrations ---
        const intLines: string[] = ["## 外部連携・技術構成（要入力）\n"];
        intLines.push("### 連携ツール\n- （未入力: Salesforce, Slack, Zoom, Stripe等の連携があれば記述）\n");
        intLines.push("### データフロー\n- （未入力: どのツールからどのデータがHubSpotに入るか）\n");
        intLines.push("### API連携\n- （未入力: 定期同期、Webhook等）\n");
        questions.push("[integrations] HubSpotと連携している外部ツールはありますか？（Slack通知、Zoom連携、会計ソフト連携等）");
        drafts.integrations = intLines.join("\n");

        // ========== 3. Knowledge Store に保存 ==========

        // セットアップ確認
        const contactSearch = await fetchJson<{ total: number; results: Array<{ id: string }> }>(
          `${BASE_URL}/crm/v3/objects/contacts/search`,
          { method: "POST", headers, body: JSON.stringify({
            filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: KNOWLEDGE_EMAIL }] }],
            limit: 1,
          }) }
        );

        let contactId: string;
        if (contactSearch.total > 0) {
          contactId = contactSearch.results[0].id;
        } else {
          // auto-setup
          const newContact = await fetchJson<{ id: string }>(
            `${BASE_URL}/crm/v3/objects/contacts`,
            { method: "POST", headers, body: JSON.stringify({
              properties: { email: KNOWLEDGE_EMAIL, firstname: "MCP Knowledge", lastname: "Store", lifecyclestage: "other" },
            }) }
          );
          contactId = newContact.id;
        }

        // 既存ノート取得
        const existingNotes = await fetchJson<{ results: Array<{ id: string; properties: Record<string, string | null> }> }>(
          `${BASE_URL}/crm/v3/objects/notes/search`,
          { method: "POST", headers, body: JSON.stringify({
            filterGroups: [{ filters: [{ propertyName: "hs_note_body", operator: "CONTAINS_TOKEN", value: "MCP_KNOWLEDGE" }] }],
            properties: ["hs_note_body"], limit: 50,
          }) }
        );

        const noteMap: Record<string, string> = {};
        for (const note of existingNotes.results) {
          const body = note.properties.hs_note_body || "";
          const match = body.match(/\[MCP_KNOWLEDGE:(\w+)\]/);
          if (match) noteMap[match[1]] = note.id;
        }

        // 保存
        let saved = 0;
        let skipped = 0;
        for (const [cat, content] of Object.entries(drafts)) {
          const noteBody = `[MCP_KNOWLEDGE:${cat}]\n\n${content}`;
          if (noteMap[cat]) {
            if (!force) { skipped++; continue; }
            await fetchJson<Record<string, unknown>>(
              `${BASE_URL}/crm/v3/objects/notes/${noteMap[cat]}`,
              { method: "PATCH", headers, body: JSON.stringify({
                properties: { hs_note_body: noteBody, hs_timestamp: new Date().toISOString() },
              }) }
            );
          } else {
            await fetchJson<Record<string, unknown>>(
              `${BASE_URL}/crm/v3/objects/notes`,
              { method: "POST", headers, body: JSON.stringify({
                properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteBody },
                associations: [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }],
              }) }
            );
          }
          saved++;
        }

        // ========== 4. 結果返却 ==========
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "success",
              summary: {
                customProperties: totalCustomProps,
                workflows: workflows.length,
                workflowsEnabled: enabledWFs,
                workflowsDisabled: disabledWFs,
                pipelines: { deals: pipelines.deals?.length || 0, tickets: pipelines.tickets?.length || 0 },
                forms: forms.length,
                lists: lists.length,
                marketingEmails: emails.length,
                owners: owners.length,
              },
              knowledgeSaved: saved,
              knowledgeSkipped: skipped,
              questions: questions,
              nextStep: "上記の質問に回答してください。回答をもとに hubspot_knowledge_update で各カテゴリを補完します。",
            }, null, 2),
          }],
        };

      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
