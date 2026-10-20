import { env } from '../../config/configuration';

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

export interface LlmResult {
  content: string;
  toolCalls: LlmToolCall[];
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface LlmProvider {
  readonly kind: 'llm' | 'offline';
  readonly label: string;
  readonly model: string;
  chat(messages: LlmMessage[], tools: unknown[]): Promise<LlmResult>;
}

const inr = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

/* ------------------------------------------------------------ OpenAI-compatible */

class OpenAiCompatibleProvider implements LlmProvider {
  readonly kind = 'llm' as const;
  readonly label = 'openai-compatible';
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async chat(messages: LlmMessage[], tools: unknown[]): Promise<LlmResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 300)}`);
      }
      const json: any = await res.json();
      const message = json?.choices?.[0]?.message ?? {};
      const toolCalls: LlmToolCall[] = (message.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name ?? '',
        arguments: tc.function?.arguments ?? '{}',
      }));
      return {
        content: message.content ?? '',
        toolCalls,
        tokensIn: json?.usage?.prompt_tokens ?? 0,
        tokensOut: json?.usage?.completion_tokens ?? 0,
        model: json?.model ?? this.model,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/* ------------------------------------------------------------ Offline provider */

const KEYWORD_TOOLS: { test: RegExp; tools: string[] }[] = [
  { test: /overdue|past due|late/, tools: ['list_overdue_demands', 'get_outstanding_summary'] },
  { test: /outstanding|receivable|dues?|owed|collect/, tools: ['get_outstanding_summary'] },
  { test: /lead|pipeline|crm|conversion|follow/, tools: ['get_leads_summary'] },
  { test: /book|sale|revenue|growth|trend|month|collect/, tools: ['get_sales_and_collections_trend'] },
  { test: /inventory|unit|stock|availab|sold/, tools: ['get_inventory_summary'] },
  { test: /construction|site|task|progress|milestone/, tools: ['get_construction_summary'] },
  { test: /project/, tools: ['list_projects'] },
];

class OfflineProvider implements LlmProvider {
  readonly kind = 'offline' as const;
  readonly label = 'offline-deterministic';
  readonly model = 'estateflow-offline';

  async chat(messages: LlmMessage[]): Promise<LlmResult> {
    const last = messages[messages.length - 1];
    // If the last message is a tool result, summarise everything collected.
    if (last?.role === 'tool') {
      const toolMsgs = messages.filter((m) => m.role === 'tool');
      const parts = toolMsgs.map((m) => this.summarise(m.name ?? '', safeParse(m.content)));
      return { content: parts.filter(Boolean).join('\n\n'), toolCalls: [], tokensIn: 0, tokensOut: 0, model: this.model };
    }

    const userMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const lower = userMsg.toLowerCase();
    const names = KEYWORD_TOOLS.find((k) => k.test.test(lower))?.tools ?? ['get_business_overview'];
    return {
      content: '',
      toolCalls: names.map((n, i) => ({ id: `call_${Date.now()}_${i}`, name: n, arguments: '{}' })),
      tokensIn: 0,
      tokensOut: 0,
      model: this.model,
    };
  }

  private summarise(name: string, data: any): string {
    if (!data) return '';
    switch (name) {
      case 'get_business_overview':
        return [
          `Here is your business overview:`,
          `- Projects: ${data.projects} · Units: ${data.units}`,
          `- Bookings: ${data.bookings} · Open leads: ${data.openLeads} · Customers: ${data.customers}`,
          `- Collections this month: ${inr(data.collectionsThisMonth)}`,
          `- Outstanding receivables: ${inr(data.outstanding)}`,
        ].join('\n');
      case 'get_outstanding_summary': {
        const lines = [`Total outstanding receivables: **${inr(data.totalOutstanding)}**.`];
        if (data.byStatus) lines.push(`By status: ${Object.entries(data.byStatus).map(([k, v]) => `${k} ${inr(v as number)}`).join(', ')}.`);
        if (data.topCustomers?.length) lines.push(`Top debtors: ${data.topCustomers.map((c: any) => `${c.customer} (${inr(c.amount)})`).join(', ')}.`);
        return lines.join('\n');
      }
      case 'list_overdue_demands':
        return Array.isArray(data) && data.length
          ? `Overdue demands (${data.length}):\n` + data.map((d: any) => `- ${d.customer}: ${inr(d.dueAmount)} due on ${String(d.dueDate).slice(0, 10)} (${d.demandNumber})`).join('\n')
          : 'There are no overdue demands right now.';
      case 'get_sales_and_collections_trend': {
        if (!Array.isArray(data) || !data.length) return 'No sales or collections recorded yet.';
        const sales = data.reduce((s: number, r: any) => s + r.sales, 0);
        const collections = data.reduce((s: number, r: any) => s + r.collections, 0);
        return `Over the last ${data.length} months, total bookings were **${inr(sales)}** and collections **${inr(collections)}**.\n` + data.map((r: any) => `- ${r.month}: sales ${inr(r.sales)}, collections ${inr(r.collections)}`).join('\n');
      }
      case 'get_leads_summary':
        return `Leads: ${data.total} total, ${data.converted} converted (${data.conversionRate}% conversion).\nBy status: ${(data.byStatus ?? []).map((s: any) => `${s.status} ${s.count}`).join(', ')}.\nBy source: ${(data.bySource ?? []).map((s: any) => `${s.source} ${s.count}`).join(', ')}.`;
      case 'get_inventory_summary':
        return `Inventory value: ${inr(data.totalValue)}.\nBy status: ${(data.byStatus ?? []).map((s: any) => `${s.status} ${s.count}`).join(', ')}.\nBy type: ${(data.byType ?? []).map((t: any) => `${t.type} ${t.count}`).join(', ')}.`;
      case 'get_construction_summary':
        return `Construction tasks by status: ${(data.byStatus ?? []).map((s: any) => `${s.status} ${s.count}`).join(', ')}.${data.upcoming?.length ? `\nDue within 14 days:\n` + data.upcoming.map((t: any) => `- ${t.name} (${t.project}, ${t.priority}) due ${String(t.dueDate).slice(0, 10)}`).join('\n') : ''}`;
      case 'list_projects':
        return Array.isArray(data) && data.length ? `Projects:\n` + data.map((p: any) => `- ${p.name} (${p.code}) — ${p.status}${p.city ? `, ${p.city}` : ''}`).join('\n') : 'No projects found.';
      case 'search_customers':
        return Array.isArray(data) && data.length ? `Matching customers:\n` + data.map((c: any) => `- ${c.firstName} ${c.lastName ?? ''} · ${c.phone}${c.email ? ` · ${c.email}` : ''}`).join('\n') : 'No matching customers found.';
      default:
        return JSON.stringify(data).slice(0, 800);
    }
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/* ------------------------------------------------------------ Factory */

let cached: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (cached) return cached;
  const e = env();
  if (e.AI_ENABLED && e.AI_API_KEY && e.AI_BASE_URL) {
    cached = new OpenAiCompatibleProvider(e.AI_BASE_URL, e.AI_API_KEY, e.AI_MODEL);
  } else {
    cached = new OfflineProvider();
  }
  return cached;
}

export function aiConfigStatus() {
  const e = env();
  const provider = getLlmProvider();
  let baseUrlHost = '';
  try {
    baseUrlHost = e.AI_BASE_URL ? new URL(e.AI_BASE_URL).host : '';
  } catch {
    baseUrlHost = e.AI_BASE_URL;
  }
  return {
    enabled: provider.kind === 'llm',
    provider: provider.label,
    model: provider.model,
    baseUrlHost,
    hasApiKey: Boolean(e.AI_API_KEY),
    mode: provider.kind === 'llm' ? 'live' : 'offline',
  };
}
