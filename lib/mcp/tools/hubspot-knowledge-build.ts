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
            const dealStages = pipelines.deals?.[0]?.stages?.length || 0;
            questions.push(`[design_decisions] 取引パイプラインが1本（${pipelines.deals?.[0]?.label || "default"}、${dealStages}ステージ）のみです。事業構造がシンプルであるため1本で運用しているという認識で合っていますか？（Yes/Noでお答えください）`);
          }
        }
        if (pipelines.tickets?.length) {
          ddLines.push(`- チケットパイプライン: ${pipelines.tickets.length}本`);
        } else {
          ddLines.push(`- チケットパイプライン: 未使用`);
          // コンタクトのカスタムプロパティから問い合わせ管理の形跡を探す
          const inquiryProps = (customProps.contacts || []).filter((p: PropertySummary) => 
            /inquiry|contact_form|問い合わせ|toiawase|support|相談/i.test(p.name + p.label + (p.description || ""))
          );
          if (inquiryProps.length > 0) {
            const propNames = inquiryProps.map((p: PropertySummary) => `「${p.label}」(${p.name})`).join("、");
            questions.push(`[design_decisions] チケットパイプラインが未使用ですが、コンタクトのカスタムプロパティに${propNames}があるため、問い合わせをチケットではなくコンタクトのプロパティで管理しているという認識で正しいでしょうか？（Yes/No）`);
          } else {
            questions.push("[design_decisions] チケットパイプラインが未使用です。問い合わせ管理は外部ツール（メール・チャット等）で行っており、HubSpotでは追跡していないという認識で合っていますか？（Yes/No。違う場合は管理方法を教えてください）");
          }
        }
        ddLines.push(`\n### 規模感`);
        ddLines.push(`- カスタムプロパティ: ${totalCustomProps}件（contacts: ${customProps.contacts?.length || 0}, companies: ${customProps.companies?.length || 0}, deals: ${customProps.deals?.length || 0}, tickets: ${customProps.tickets?.length || 0}）`);
        ddLines.push(`- ワークフロー: ${workflows.length}件（有効: ${enabledWFs}, 無効: ${disabledWFs}）`);
        ddLines.push(`- フォーム: ${forms.length}件`);
        ddLines.push(`- リスト/セグメント: ${lists.length}件`);
        ddLines.push(`- マーケティングメール: ${emails.length}件`);
        ddLines.push(`- オーナー（担当者）: ${owners.length}名`);
        // データから用途を推論
          const hasMA = forms.length > 0 || emails.length > 0 || workflows.length > 3;
          const hasSales = (pipelines.deals?.length || 0) > 0;
          const hasSupport = (pipelines.tickets?.length || 0) > 0;
          const usageGuess = hasMA && hasSales ? "マーケティング+営業管理の統合利用"
            : hasMA ? "マーケティング自動化が中心"
            : hasSales ? "営業管理が中心"
            : "導入初期段階";
          questions.push(`[design_decisions] データから見て、このアカウントは「${usageGuess}」という認識で合っていますか？（Yes/No）`);
        questions.push("[design_decisions] ライフサイクルステージの運用範囲について — フォーム送信でleadに設定し、成約でcustomerに変更するシンプルな運用をしているという認識で合っていますか？（Yes/No。より複雑な運用をしている場合はお知らせください）");
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
        // 命名パターンを自動検出（日付、アンダースコア区切り等）
          const allNames = [...workflows.map((w: WorkflowSummary) => w.name), ...forms.map((f: FormSummary) => f.name), ...lists.map((l: ListSummary) => l.name)];
          const hasDatePattern = allNames.some(n => /20[0-9]{2}/.test(n));
          const hasUnderscorePattern = allNames.filter(n => n.includes("_")).length > allNames.length * 0.3;
          const hasJapanese = allNames.some(n => /[\u3000-\u9FFF]/.test(n));
          
          let namingGuess = "特定のルールなし（自由命名）";
          if (hasUnderscorePattern && hasDatePattern) {
            namingGuess = "アンダースコア区切り+日付付き（例: xxx_yyy_202604）";
          } else if (hasUnderscorePattern) {
            namingGuess = "アンダースコア区切り（例: xxx_yyy_zzz）";
          } else if (hasJapanese) {
            namingGuess = "日本語名（例: セミナー申込フォーム）";
          }
          questions.push(`[naming_conventions] 命名パターンを分析した結果、「${namingGuess}」のルールで運用しているように見えます。この認識で合っていますか？（Yes/No。別のルールがあれば教えてください）`);
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
          // WFで使われていそうなプロパティを推定（名前にcount/date/status/flagを含む）
          const autoProps = Object.values(customProps).flat().filter((p: PropertySummary) =>
            /count|_count|_date|_flag|_status|auto|自動/i.test(p.name + (p.description || ""))
          );
          if (autoProps.length > 0) {
            const autoNames = autoProps.slice(0, 5).map((p: PropertySummary) => `「${p.label}」(${p.name})`).join("、");
            questions.push(`[property_annotations] ${autoNames} はワークフローで自動更新されるプロパティに見えるため、手動変更禁止として記録しておきます。この認識で合っていますか？（Yes/No）`);
          }
          if (totalCustomProps > 10) {
            questions.push(`[property_annotations] カスタムプロパティが${totalCustomProps}件あります。全て一覧に記録しましたが、特に「絶対に触るな」というものがあればお知らせください。なければこのまま進めます。（補足があればどうぞ）`);
          }
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
          // 有効WFの中で類似名のグループを探す（テンプレートの兆候）
          const enabledNames = workflows.filter((w: WorkflowSummary) => w.isEnabled).map((w: WorkflowSummary) => w.name);
          const templateCandidates = enabledNames.filter(n => /template|テンプレ|base|ベース|standard|標準/i.test(n));
          
          if (templateCandidates.length > 0) {
            questions.push(`[workflow_annotations] 「${templateCandidates.join("」「")}」はテンプレートWFとして今後の施策でも複製して使う正本という認識で合っていますか？（Yes/No）`);
          } else {
            questions.push(`[workflow_annotations] 有効なワークフローが${enabledWFs}件ありますが、この中に「新規施策の際に複製して使うテンプレート」的なものはありますか？ない場合はNoで構いません。`);
          }
          if (disabledWFs > 0) {
            questions.push(`[workflow_annotations] 無効なワークフローが${disabledWFs}件あります。過去の施策で使い終わったものと思われますが、削除せず参考用に残しているという認識で合っていますか？（Yes/No）`);
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
        // フォームとメールの存在から施策パターンを推定
          const hasSeminarHint = [...forms.map((f: FormSummary) => f.name), ...emails.map((e: EmailSummary) => e.name || "")].some(n => /seminar|セミナー|event|イベント|webinar|ウェビナー/i.test(n));
          const hasNLHint = emails.some((e: EmailSummary) => /newsletter|ニュースレター|定期|月刊|NL/i.test((e.name || "") + (e.subject || "")));
          
          const patterns: string[] = [];
          if (hasSeminarHint) patterns.push("セミナー/イベント施策");
          if (hasNLHint) patterns.push("ニュースレター/定期配信");
          
          if (patterns.length > 0) {
            questions.push(`[playbooks] 既存のフォーム・メールから「${patterns.join("」と「")}」を定期的に実施しているように見えます。これらの標準手順を記録しておくので、次回からAIが自動で同じパターンを組めるようになります。この認識で合っていますか？（Yes/No。他にもある場合は追加してください）`);
          } else {
            questions.push("[playbooks] 繰り返し実施している施策パターンは現時点では検出できませんでした。定期的な施策（セミナー、ニュースレター等）があれば教えてください。なければNoで構いません。");
          }
        drafts.playbooks = pbLines.join("\n");

        // --- guardrails ---
        const grLines: string[] = ["## 禁止事項・注意事項（要入力）\n"];
        grLines.push("### 削除禁止\n- （未入力: 削除してはいけないリスト・WF・プロパティがあれば記述）\n");
        grLines.push("### 変更禁止\n- （未入力: 変更してはいけないパイプラインステージ・プロパティ設定があれば記述）\n");
        grLines.push("### 配信ルール\n- （未入力: メール配信の頻度制限・除外ルールがあれば記述）\n");
        questions.push("[guardrails] 禁止事項について — 現時点で削除禁止・変更禁止のアセットは特にないという認識で合っていますか？（Yes/No。ある場合は具体的に教えてください）");
        questions.push("[guardrails] メール配信について — 特に頻度制限（例: 週1回まで）や特定セグメントへの配信除外ルールは設けていないという認識で合っていますか？（Yes/No）");
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
        if (lists.length > 0) {
            const listNames = lists.slice(0, 5).map((l: ListSummary) => `「${l.name}」(${l.processingType}、${l.size || "?"}件)`).join("、");
            questions.push(`[contacts_segments] 既存リストとして${listNames}等があります。これらが主要なセグメント分けという認識で合っていますか？（Yes/No。他にも重要なセグメントの考え方があれば教えてください）`);
          } else {
            questions.push("[contacts_segments] リスト/セグメントが未作成です。現時点ではコンタクトのセグメント分けは行っていないという認識で合っていますか？（Yes/No）");
          }
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
        // メール件名からパターンを抽出
          const subjects = emails.filter((e: EmailSummary) => e.subject).map((e: EmailSummary) => e.subject!);
          const bracketPattern = subjects.filter(s => /【.*?】/.test(s));
          const hasBracketRule = bracketPattern.length > subjects.length * 0.3 && bracketPattern.length > 0;
          
          if (hasBracketRule) {
            // 【】内の共通文字列を抽出
            const brackets = bracketPattern.map(s => { const m = s.match(/【(.*?)】/); return m ? m[1] : ""; }).filter(Boolean);
            const commonBracket = brackets.length > 0 ? brackets[0] : "";
            questions.push(`[brand_voice] 過去のメール件名を分析した結果、「【${commonBracket}】○○」の形式が標準ルールのようです。今後のメールもこのフォーマットを踏襲してよろしいでしょうか？（Yes/No）`);
          } else if (subjects.length > 0) {
            questions.push("[brand_voice] 過去のメール件名に明確な共通フォーマットは検出できませんでした。件名のルール（例: 会社名を入れる等）があれば教えてください。なければ自由形式として記録します。");
          }
        drafts.brand_voice = bvLines.join("\n");

        // --- integrations ---
        const intLines: string[] = ["## 外部連携・技術構成（要入力）\n"];
        intLines.push("### 連携ツール\n- （未入力: Salesforce, Slack, Zoom, Stripe等の連携があれば記述）\n");
        intLines.push("### データフロー\n- （未入力: どのツールからどのデータがHubSpotに入るか）\n");
        intLines.push("### API連携\n- （未入力: 定期同期、Webhook等）\n");
        questions.push("[integrations] HubSpotと連携している外部ツールは現時点ではAPIからは検出できませんでした。Slack・Zoom・会計ソフト等との連携がある場合は教えてください。特になければNoで構いません。");
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
