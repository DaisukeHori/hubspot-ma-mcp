#!/bin/bash
# HubSpot MCP Server E2E Test (curl-based)

MCP_URL="https://hubspot-ma-mcp.vercel.app/api/mcp"
TOKEN="$1"
SESSION_ID=""
PASS=0
FAIL=0
TOTAL=0

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <HUBSPOT_PAT>"
  exit 1
fi

# MCP call function
mcp_call() {
  local method="$1"
  local params="$2"
  local id=$((++TOTAL))
  
  local session_header=""
  if [ -n "$SESSION_ID" ]; then
    session_header="-H \"Mcp-Session-Id: $SESSION_ID\""
  fi
  
  local resp
  resp=$(curl -s -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer $TOKEN" \
    ${SESSION_ID:+-H "Mcp-Session-Id: $SESSION_ID"} \
    -d "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":$params}")
  
  # Extract session ID
  local new_sid
  new_sid=$(echo "$resp" | grep -o '"Mcp-Session-Id":"[^"]*"' | head -1 | cut -d'"' -f4)
  [ -n "$new_sid" ] && SESSION_ID="$new_sid"
  
  # Parse SSE response
  echo "$resp" | grep "^data: " | sed 's/^data: //' | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        d = json.loads(line.strip())
        if 'result' in d:
            print(json.dumps(d['result']))
            break
        elif 'error' in d:
            print(json.dumps(d['error']))
            break
    except: pass
" 2>/dev/null
}

# Tool call helper
call_tool() {
  local name="$1"
  local args="$2"
  mcp_call "tools/call" "{\"name\":\"$name\",\"arguments\":$args}"
}

# Log result
log_result() {
  local tool="$1"
  local action="$2"
  local result="$3"
  local detail="$4"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ "$result" = "PASS" ]; then
    PASS=$((PASS + 1))
    echo "  ✅ $tool [$action] $detail"
  else
    FAIL=$((FAIL + 1))
    echo "  ❌ $tool [$action] $detail"
    FAILED_TESTS="$FAILED_TESTS\n    ❌ $tool [$action]: $detail"
  fi
}

TOTAL_TESTS=0
FAILED_TESTS=""

echo ""
echo "🚀 HubSpot MCP E2E Test Starting..."
echo ""
echo "  MCP: $MCP_URL"
echo "  Token: ${TOKEN:0:10}...${TOKEN: -4}"
echo ""

# Initialize
TOTAL=0
mcp_call "initialize" '{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"e2e-test","version":"1.0"}}' > /dev/null

# Tool count
echo "📋 Tool List Check"
TOOLS_JSON=$(mcp_call "tools/list" '{}')
TOOL_COUNT=$(echo "$TOOLS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('tools',[])))" 2>/dev/null)
if [ "${TOOL_COUNT:-0}" -ge 59 ]; then
  log_result "tools/list" "count" "PASS" "$TOOL_COUNT tools"
else
  log_result "tools/list" "count" "FAIL" "Got $TOOL_COUNT, expected >=59"
fi

# ── CONTACTS ──
echo ""
echo "👤 Contacts"
TS=$(date +%s)

RESULT=$(call_tool "contact_create" "{\"email\":\"mcp-e2e-${TS}@test.example.com\",\"firstname\":\"MCP\",\"lastname\":\"E2E\"}")
CONTACT_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
if [ -n "$CONTACT_ID" ]; then
  log_result "contact_create" "create" "PASS" "ID: $CONTACT_ID"
else
  log_result "contact_create" "create" "FAIL" "$RESULT"
fi

if [ -n "$CONTACT_ID" ]; then
  RESULT=$(call_tool "contact_get" "{\"contactId\":\"$CONTACT_ID\"}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "contact_get" "get" "PASS" || log_result "contact_get" "get" "FAIL"

  RESULT=$(call_tool "contact_update" "{\"contactId\":\"$CONTACT_ID\",\"properties\":{\"company\":\"Updated\"}}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "contact_update" "update" "PASS" || log_result "contact_update" "update" "FAIL"

  RESULT=$(call_tool "contact_search" "{\"query\":\"MCP E2E\",\"limit\":1}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "contact_search" "search" "PASS" || log_result "contact_search" "search" "FAIL"
fi

# ── COMPANIES ──
echo ""
echo "🏢 Companies"

RESULT=$(call_tool "company_create" "{\"name\":\"MCP E2E Corp ${TS}\"}")
COMPANY_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$COMPANY_ID" ] && log_result "company_create" "create" "PASS" "ID: $COMPANY_ID" || log_result "company_create" "create" "FAIL"

if [ -n "$COMPANY_ID" ]; then
  RESULT=$(call_tool "company_get" "{\"companyId\":\"$COMPANY_ID\"}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "company_get" "get" "PASS" || log_result "company_get" "get" "FAIL"

  RESULT=$(call_tool "company_update" "{\"companyId\":\"$COMPANY_ID\",\"properties\":{\"industry\":\"INFORMATION_TECHNOLOGY_AND_SERVICES\"}}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "company_update" "update" "PASS" || log_result "company_update" "update" "FAIL"

  RESULT=$(call_tool "company_search" "{\"query\":\"MCP E2E\",\"limit\":1}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "company_search" "search" "PASS" || log_result "company_search" "search" "FAIL"
fi

# ── DEALS ──
echo ""
echo "💰 Deals"
RESULT=$(call_tool "deal_create" "{\"dealname\":\"MCP E2E Deal ${TS}\",\"amount\":\"10000\"}")
DEAL_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$DEAL_ID" ] && log_result "deal_create" "create" "PASS" "ID: $DEAL_ID" || log_result "deal_create" "create" "FAIL"

if [ -n "$DEAL_ID" ]; then
  RESULT=$(call_tool "deal_get" "{\"dealId\":\"$DEAL_ID\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "deal_get" "get" "PASS" || log_result "deal_get" "get" "FAIL"
  RESULT=$(call_tool "deal_update" "{\"dealId\":\"$DEAL_ID\",\"properties\":{\"amount\":\"20000\"}}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "deal_update" "update" "PASS" || log_result "deal_update" "update" "FAIL"
  RESULT=$(call_tool "deal_search" "{\"query\":\"MCP E2E\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "deal_search" "search" "PASS" || log_result "deal_search" "search" "FAIL"
fi

# ── TICKETS ──
echo ""
echo "🎫 Tickets"
RESULT=$(call_tool "ticket_create" "{\"subject\":\"MCP E2E Ticket ${TS}\",\"hs_pipeline\":\"0\",\"hs_pipeline_stage\":\"1\"}")
TICKET_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$TICKET_ID" ] && log_result "ticket_create" "create" "PASS" "ID: $TICKET_ID" || log_result "ticket_create" "create" "FAIL"

if [ -n "$TICKET_ID" ]; then
  RESULT=$(call_tool "ticket_get" "{\"ticketId\":\"$TICKET_ID\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "ticket_get" "get" "PASS" || log_result "ticket_get" "get" "FAIL"
  RESULT=$(call_tool "ticket_update" "{\"ticketId\":\"$TICKET_ID\",\"properties\":{\"hs_ticket_priority\":\"HIGH\"}}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "ticket_update" "update" "PASS" || log_result "ticket_update" "update" "FAIL"
  RESULT=$(call_tool "ticket_search" "{\"query\":\"MCP E2E\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "ticket_search" "search" "PASS" || log_result "ticket_search" "search" "FAIL"
fi

# ── NOTES ──
echo ""
echo "📝 Notes"
RESULT=$(call_tool "note_create" "{\"body\":\"<p>MCP E2E Test Note ${TS}</p>\"}")
NOTE_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$NOTE_ID" ] && log_result "note_create" "create" "PASS" "ID: $NOTE_ID" || log_result "note_create" "create" "FAIL"

if [ -n "$NOTE_ID" ]; then
  RESULT=$(call_tool "note_get" "{\"noteId\":\"$NOTE_ID\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "note_get" "get" "PASS" || log_result "note_get" "get" "FAIL"
  RESULT=$(call_tool "note_update" "{\"noteId\":\"$NOTE_ID\",\"properties\":{\"hs_note_body\":\"<p>Updated</p>\"}}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "note_update" "update" "PASS" || log_result "note_update" "update" "FAIL"
  RESULT=$(call_tool "note_search" "{\"query\":\"MCP E2E\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "note_search" "search" "PASS" || log_result "note_search" "search" "FAIL"
fi

# ── TASKS ──
echo ""
echo "✅ Tasks"
RESULT=$(call_tool "task_create" "{\"subject\":\"MCP E2E Task ${TS}\",\"status\":\"NOT_STARTED\",\"priority\":\"HIGH\"}")
TASK_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$TASK_ID" ] && log_result "task_create" "create" "PASS" "ID: $TASK_ID" || log_result "task_create" "create" "FAIL"

if [ -n "$TASK_ID" ]; then
  RESULT=$(call_tool "task_get" "{\"taskId\":\"$TASK_ID\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "task_get" "get" "PASS" || log_result "task_get" "get" "FAIL"
  RESULT=$(call_tool "task_update" "{\"taskId\":\"$TASK_ID\",\"properties\":{\"hs_task_status\":\"COMPLETED\"}}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "task_update" "update" "PASS" || log_result "task_update" "update" "FAIL"
  RESULT=$(call_tool "task_search" "{\"query\":\"MCP E2E\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "task_search" "search" "PASS" || log_result "task_search" "search" "FAIL"
fi

# ── ASSOCIATIONS ──
echo ""
echo "🔗 Associations"
RESULT=$(call_tool "association_labels" "{\"fromObjectType\":\"contacts\",\"toObjectType\":\"companies\",\"action\":\"list\"}")
IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
[ "$IS_ERR" = "ok" ] && log_result "association_labels" "list" "PASS" || log_result "association_labels" "list" "FAIL"

if [ -n "$CONTACT_ID" ] && [ -n "$COMPANY_ID" ]; then
  RESULT=$(call_tool "association_create" "{\"fromObjectType\":\"contacts\",\"fromObjectId\":\"$CONTACT_ID\",\"toObjectType\":\"companies\",\"toObjectId\":\"$COMPANY_ID\"}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "association_create" "create" "PASS" || log_result "association_create" "create" "FAIL" "$RESULT"

  sleep 1
  RESULT=$(call_tool "association_list" "{\"fromObjectType\":\"contacts\",\"fromObjectId\":\"$CONTACT_ID\",\"toObjectType\":\"companies\"}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "association_list" "list" "PASS" || log_result "association_list" "list" "FAIL"

  RESULT=$(call_tool "association_delete" "{\"fromObjectType\":\"contacts\",\"fromObjectId\":\"$CONTACT_ID\",\"toObjectType\":\"companies\",\"toObjectId\":\"$COMPANY_ID\"}")
  IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "association_delete" "delete" "PASS" || log_result "association_delete" "delete" "FAIL"
fi

# ── PRODUCTS ──
echo ""
echo "📦 Products"
RESULT=$(call_tool "product_create" "{\"name\":\"MCP E2E Product ${TS}\",\"price\":\"9999\"}")
PRODUCT_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$PRODUCT_ID" ] && log_result "product_create" "create" "PASS" "ID: $PRODUCT_ID" || log_result "product_create" "create" "FAIL"

if [ -n "$PRODUCT_ID" ]; then
  RESULT=$(call_tool "product_get" "{\"productId\":\"$PRODUCT_ID\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "product_get" "get" "PASS" || log_result "product_get" "get" "FAIL"
  RESULT=$(call_tool "product_update" "{\"productId\":\"$PRODUCT_ID\",\"properties\":{\"price\":\"19999\"}}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "product_update" "update" "PASS" || log_result "product_update" "update" "FAIL"
  RESULT=$(call_tool "product_search" "{\"query\":\"MCP E2E\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "product_search" "search" "PASS" || log_result "product_search" "search" "FAIL"
fi

# ── LINE ITEMS ──
echo ""
echo "📋 Line Items"
RESULT=$(call_tool "lineitem_create" "{\"name\":\"MCP E2E LI ${TS}\",\"quantity\":\"5\",\"price\":\"1000\"}")
LI_ID=$(echo "$RESULT" | python3 -c "import sys,re; m=re.search(r'hs_object_id.*?(\d{8,})', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)
[ -n "$LI_ID" ] && log_result "lineitem_create" "create" "PASS" "ID: $LI_ID" || log_result "lineitem_create" "create" "FAIL"

if [ -n "$LI_ID" ]; then
  RESULT=$(call_tool "lineitem_get" "{\"lineItemId\":\"$LI_ID\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "lineitem_get" "get" "PASS" || log_result "lineitem_get" "get" "FAIL"
  RESULT=$(call_tool "lineitem_update" "{\"lineItemId\":\"$LI_ID\",\"properties\":{\"quantity\":\"10\"}}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "lineitem_update" "update" "PASS" || log_result "lineitem_update" "update" "FAIL"
  RESULT=$(call_tool "lineitem_search" "{\"query\":\"MCP E2E\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
  [ "$IS_ERR" = "ok" ] && log_result "lineitem_search" "search" "PASS" || log_result "lineitem_search" "search" "FAIL"
fi

# ── READ-ONLY: Properties, Pipelines, Workflows, CMS ──
echo ""
echo "🏷 Properties / 🔧 Pipelines / ⚡ Workflows / 🌐 CMS"
RESULT=$(call_tool "properties_list" "{\"objectType\":\"contacts\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
[ "$IS_ERR" = "ok" ] && log_result "properties_list" "list" "PASS" || log_result "properties_list" "list" "FAIL"
RESULT=$(call_tool "pipeline_list" "{\"objectType\":\"deals\"}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
[ "$IS_ERR" = "ok" ] && log_result "pipeline_list" "list" "PASS" || log_result "pipeline_list" "list" "FAIL"
RESULT=$(call_tool "workflow_list" "{}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
[ "$IS_ERR" = "ok" ] && log_result "workflow_list" "list" "PASS" || log_result "workflow_list" "list" "FAIL"
RESULT=$(call_tool "cms_blog_list" "{\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
[ "$IS_ERR" = "ok" ] && log_result "cms_blog_list" "list" "PASS" || log_result "cms_blog_list" "list" "FAIL"
RESULT=$(call_tool "cms_page_list" "{\"pageType\":\"site-pages\",\"limit\":1}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null)
[ "$IS_ERR" = "ok" ] && log_result "cms_page_list" "list" "PASS" || log_result "cms_page_list" "list" "FAIL"

# ── CLEANUP ──
echo ""
echo "🧹 Cleanup"
[ -n "$LI_ID" ] && { RESULT=$(call_tool "lineitem_delete" "{\"lineItemId\":\"$LI_ID\",\"confirm\":true}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null); [ "$IS_ERR" = "ok" ] && log_result "lineitem_delete" "delete" "PASS" || log_result "lineitem_delete" "delete" "FAIL"; }
[ -n "$PRODUCT_ID" ] && { RESULT=$(call_tool "product_delete" "{\"productId\":\"$PRODUCT_ID\",\"confirm\":true}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null); [ "$IS_ERR" = "ok" ] && log_result "product_delete" "delete" "PASS" || log_result "product_delete" "delete" "FAIL"; }
[ -n "$TICKET_ID" ] && { RESULT=$(call_tool "ticket_delete" "{\"ticketId\":\"$TICKET_ID\",\"confirm\":true}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null); [ "$IS_ERR" = "ok" ] && log_result "ticket_delete" "delete" "PASS" || log_result "ticket_delete" "delete" "FAIL"; }
[ -n "$DEAL_ID" ] && { RESULT=$(call_tool "deal_delete" "{\"dealId\":\"$DEAL_ID\",\"confirm\":true}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null); [ "$IS_ERR" = "ok" ] && log_result "deal_delete" "delete" "PASS" || log_result "deal_delete" "delete" "FAIL"; }
[ -n "$COMPANY_ID" ] && { RESULT=$(call_tool "company_delete" "{\"companyId\":\"$COMPANY_ID\",\"confirm\":true}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null); [ "$IS_ERR" = "ok" ] && log_result "company_delete" "delete" "PASS" || log_result "company_delete" "delete" "FAIL"; }
[ -n "$CONTACT_ID" ] && { RESULT=$(call_tool "contact_delete" "{\"contactId\":\"$CONTACT_ID\",\"confirm\":true}"); IS_ERR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('error' if d.get('isError') else 'ok')" 2>/dev/null); [ "$IS_ERR" = "ok" ] && log_result "contact_delete" "delete" "PASS" || log_result "contact_delete" "delete" "FAIL"; }

# ── SUMMARY ──
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "════════════════════════════════════════════════════════════"
echo "  ✅ PASS: $PASS"
echo "  ❌ FAIL: $FAIL"
echo "  📊 TOTAL: $TOTAL_TESTS"
if [ $((PASS + FAIL)) -gt 0 ]; then
  RATE=$(echo "scale=1; $PASS * 100 / ($PASS + $FAIL)" | bc)
  echo "  🎯 Rate: ${RATE}%"
fi
if [ -n "$FAILED_TESTS" ]; then
  echo ""
  echo "  Failed:"
  echo -e "$FAILED_TESTS"
fi
echo "════════════════════════════════════════════════════════════"
