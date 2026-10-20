import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated } from '../../common/utils/pagination';
import { requireOrgId } from '../../common/utils/tenant';
import { currentUserId } from '../../prisma/tenant-context';
import { PaginationInput } from '@re/shared';
import { AI_TOOLS, openAiTools, toolSchemaFor } from './ai.tools';
import { aiConfigStatus, getLlmProvider, type LlmMessage } from './ai.provider';

const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  status() {
    return { ...aiConfigStatus(), tools: AI_TOOLS.map((t) => ({ name: t.name, description: t.description })) };
  }

  async listConversations(q: PaginationInput) {
    const userId = currentUserId() ?? undefined;
    const where: any = userId ? { userId } : {};
    const [items, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.aiConversation.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createConversation(title?: string) {
    const userId = currentUserId();
    if (!userId) throw errors.unauthorized();
    return this.prisma.aiConversation.create({
      data: { organizationId: requireOrgId(), userId, title: title ?? 'New conversation' },
    });
  }

  async getConversation(id: string) {
    const convo = await this.prisma.aiConversation.findFirst({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!convo) throw errors.notFound('Conversation');
    return convo;
  }

  async removeConversation(id: string) {
    await this.getConversation(id);
    await this.prisma.aiConversation.delete({ where: { id } });
    return { id };
  }

  async addMessage(id: string, content: string) {
    const convo = await this.getConversation(id);
    const orgId = requireOrgId();
    const userId = currentUserId();
    const provider = getLlmProvider();

    const userMessage = await this.prisma.aiMessage.create({
      data: { organizationId: orgId, conversationId: id, role: 'user', content },
    });

    const history = convo.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map<LlmMessage>((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const system: LlmMessage = { role: 'system', content: await this.systemPrompt() };
    const messages: LlmMessage[] = [system, ...history, { role: 'user', content }];

    const tools = openAiTools();
    const usedTools: string[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    let reply = '';
    let model: string = provider.model;

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const res = await provider.chat(messages, tools);
      tokensIn += res.tokensIn;
      tokensOut += res.tokensOut;
      model = res.model;

      if (!res.toolCalls.length) {
        reply = res.content?.trim() || reply;
        break;
      }

      messages.push({
        role: 'assistant',
        content: res.content ?? '',
        tool_calls: res.toolCalls.map((tc) => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } })),
      });

      for (const call of res.toolCalls) {
        usedTools.push(call.name);
        const tool = toolSchemaFor(call.name);
        let payload: unknown;
        try {
          const args = call.arguments ? JSON.parse(call.arguments) : {};
          payload = tool ? await tool.run(this.prisma, args) : { error: `Unknown tool ${call.name}` };
        } catch (err) {
          payload = { error: err instanceof Error ? err.message : 'Tool execution failed' };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: JSON.stringify(payload) });
      }
    }

    if (!reply) reply = 'I could not complete that request. Please try rephrasing your question.';

    if (!tokensIn) tokensIn = this.estimateTokens(messages.map((m) => m.content).join(' '));
    if (!tokensOut) tokensOut = this.estimateTokens(reply);

    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        organizationId: orgId,
        conversationId: id,
        role: 'assistant',
        content: reply,
        meta: { provider: provider.label, model, tools: [...new Set(usedTools)] },
      },
    });

    const titleUpdate: any = { updatedAt: new Date() };
    if ((convo.title ?? 'New conversation') === 'New conversation' && convo.messages.length === 0) {
      titleUpdate.title = content.slice(0, 60);
    }
    await this.prisma.aiConversation.update({ where: { id }, data: titleUpdate });

    await this.prisma.aiUsage.create({
      data: { organizationId: orgId, userId: userId ?? null, feature: 'BUSINESS_ASSISTANT', tokensIn, tokensOut },
    });

    return { userMessage, assistantMessage };
  }

  async usage(q: PaginationInput) {
    const where: any = {};
    const [items, total] = await Promise.all([
      this.prisma.aiUsage.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiUsage.count({ where }),
    ]);
    const agg = await this.prisma.aiUsage.aggregate({ _sum: { tokensIn: true, tokensOut: true } });
    return { ...paginated(items, total, q.page, q.limit), totals: { tokensIn: agg._sum.tokensIn ?? 0, tokensOut: agg._sum.tokensOut ?? 0 } };
  }

  /* ------------------------------------------------ AI intelligence panels */

  private engine() {
    const s = aiConfigStatus();
    return s.mode === 'live' ? 'llm' : 'statistical';
  }

  /** Best-effort LLM narration over already-computed statistics. Never throws. */
  private async narrate(instruction: string, data: unknown): Promise<string | null> {
    const provider = getLlmProvider();
    if (provider.kind !== 'llm') return null;
    try {
      const res = await provider.chat(
        [
          { role: 'system', content: `You are EstateFlow AI. ${instruction} Answer in concise markdown with short bullets and bold key figures. Never invent numbers - only use the data provided.` },
          { role: 'user', content: JSON.stringify(data).slice(0, 12_000) },
        ],
        [],
      );
      return res.content?.trim() || null;
    } catch {
      return null;
    }
  }

  async leadInsights() {
    const leads = await this.prisma.lead.findMany({
      where: { deletedAt: null, status: { notIn: ['CONVERTED', 'LOST', 'UNQUALIFIED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        followUps: { where: { status: 'PENDING' }, orderBy: { scheduledAt: 'asc' }, take: 1 },
        _count: { select: { activities: true, followUps: true } },
      },
    });

    const statusWeight: Record<string, number> = {
      NEW: 0.15, CONTACTED: 0.32, QUALIFIED: 0.55, SITE_VISIT: 0.7, NEGOTIATION: 0.86,
    };
    const dayMs = 86_400_000;
    const now = Date.now();

    const analysed = leads.map((l) => {
      const base = statusWeight[l.status] ?? 0.2;
      const scoreBoost = (l.score ?? 0) / 100 * 0.22;
      const daysSinceActivity = l.lastActivityAt ? (now - new Date(l.lastActivityAt).getTime()) / dayMs : 30;
      const recencyPenalty = daysSinceActivity > 14 ? 0.12 : daysSinceActivity > 7 ? 0.06 : 0;
      const followUp = l.followUps[0] ?? null;
      const followUpOverdue = followUp ? new Date(followUp.scheduledAt).getTime() < now : !l.nextFollowUpAt ? true : new Date(l.nextFollowUpAt).getTime() < now;
      const probability = Math.round(Math.min(0.97, Math.max(0.05, base + scoreBoost - recencyPenalty)) * 100);
      const priority = probability >= 70 || l.status === 'NEGOTIATION' ? 'HIGH' : probability >= 40 || followUpOverdue ? 'MEDIUM' : 'LOW';
      return {
        id: l.id,
        leadNumber: l.leadNumber,
        name: l.name,
        phone: l.phone,
        email: l.email,
        status: l.status,
        source: l.source,
        score: l.score,
        budgetMax: Number(l.budgetMax ?? 0),
        daysSinceActivity: Math.round(daysSinceActivity),
        activities: l._count.activities,
        conversionProbability: probability,
        priority,
        followUpOverdue,
        nextFollowUpAt: l.nextFollowUpAt ?? followUp?.scheduledAt ?? null,
        suggestedMessage: this.suggestedMessage(l.name, l.status, l.budgetMax ? Number(l.budgetMax) : null),
      };
    });

    analysed.sort((a, b) => b.conversionProbability - a.conversionProbability);
    const summary = {
      total: analysed.length,
      highPriority: analysed.filter((a) => a.priority === 'HIGH').length,
      overdueFollowUps: analysed.filter((a) => a.followUpOverdue).length,
      avgProbability: analysed.length ? Math.round(analysed.reduce((s, a) => s + a.conversionProbability, 0) / analysed.length) : 0,
    };
    const narrative = await this.narrate(
      'Summarize the CRM lead pipeline health, the most promising leads and what the sales team should do next.',
      { summary, topLeads: analysed.slice(0, 8) },
    );

    return {
      engine: this.engine(),
      disclaimer: 'Conversion probabilities are AI-generated estimates based on pipeline stage, lead score and engagement recency. They are advisory only.',
      summary,
      narrative,
      leads: analysed,
    };
  }

  private suggestedMessage(name: string, status: string, budget: number | null): string {
    const first = name.split(' ')[0];
    const budgetText = budget ? ` (budget up to ${(budget / 100000).toFixed(0)} lakh)` : '';
    const byStage: Record<string, string> = {
      NEW: `Hi ${first}, thank you for your interest${budgetText}. I'd love to share a curated set of homes that match your requirements. When is a good time for a quick call?`,
      CONTACTED: `Hi ${first}, following up on our last conversation${budgetText}. I've shortlisted a few units I think you'll love - may I send the details?`,
      QUALIFIED: `Hi ${first}, great speaking with you. Based on your requirements${budgetText}, the best-fit units in our latest phase are filling fast. Shall we schedule a site visit this week?`,
      SITE_VISIT: `Hi ${first}, thank you for visiting. I can hold your preferred unit for a short period if you'd like to go ahead. Would you like to discuss the payment plan?`,
      NEGOTIATION: `Hi ${first}, I've spoken with our team about your offer. We have a workable proposal to share - can we connect for 10 minutes today?`,
    };
    return byStage[status] ?? byStage.NEW;
  }

  async financialInsights() {
    const trend = (await toolSchemaFor('get_sales_and_collections_trend')!.run(this.prisma, { months: 6 })) as any[];
    const outstanding = (await toolSchemaFor('get_outstanding_summary')!.run(this.prisma, { topCustomers: 8 })) as any;
    const overdue = (await toolSchemaFor('list_overdue_demands')!.run(this.prisma, { limit: 15 })) as any[];

    const threeMonthCollections = trend.slice(-3).reduce((s, r) => s + Number(r.collections ?? 0), 0);
    const predictedNextMonth = Math.round(threeMonthCollections / 3);
    const collectionsTrendUp = trend.length >= 2 && Number(trend[trend.length - 1].collections ?? 0) >= Number(trend[trend.length - 2].collections ?? 0);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [expenseAgg, expenseByCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) }, status: { not: 'REJECTED' } }, _sum: { totalAmount: true } }),
      this.prisma.expense.groupBy({ by: ['categoryId'], where: { date: { gte: monthStart }, status: { not: 'REJECTED' } }, _sum: { totalAmount: true } }),
    ]);

    const collectionRate = (() => {
      const sales = trend.reduce((s, r) => s + Number(r.sales ?? 0), 0);
      const collections = trend.reduce((s, r) => s + Number(r.collections ?? 0), 0);
      return sales ? Math.round((collections / sales) * 100) : 0;
    })();

    const insights = [
      collectionsTrendUp
        ? { kind: 'TREND', severity: 'GOOD', text: 'Collections are trending upward versus the previous month.' }
        : { kind: 'TREND', severity: 'WARN', text: 'Collections declined versus the previous month - consider focused follow-ups.' },
      {
        kind: 'PREDICTION',
        severity: 'INFO',
        text: `Based on the last 3 months, next month's collections are likely to be around ${predictedNextMonth}.`,
      },
      {
        kind: 'OVERDUE',
        severity: overdue.length > 5 ? 'RISK' : 'INFO',
        text: `${overdue.length} overdue demands worth ${Number(outstanding.totalOutstanding ?? 0) > 0 ? 'attention' : 'found'}. Priority: contact the top debtors listed below.`,
      },
      {
        kind: 'EXPENSE',
        severity: 'INFO',
        text: `Total expenses in the last 6 months: ${Number(expenseAgg._sum.totalAmount ?? 0)}.`,
      },
    ];

    const narrative = await this.narrate(
      'Explain the financial health of this real-estate business: revenue, collections, receivables and recommended actions.',
      { trend, outstanding, predictedNextMonth, collectionRate, insights },
    );

    return {
      engine: this.engine(),
      disclaimer: 'Forecasts and recommendations are AI-generated advisory estimates from historical data. They never modify accounting records.',
      narrative,
      trend,
      outstanding,
      overdue,
      prediction: { nextMonthCollections: predictedNextMonth, collectionRate, trendUp: collectionsTrendUp },
      expenses: { last6Months: Number(expenseAgg._sum.totalAmount ?? 0), thisMonthByCategory: expenseByCategory.map((c) => ({ categoryId: c.categoryId, amount: Number(c._sum.totalAmount ?? 0) })) },
      insights,
    };
  }

  async projectInsights() {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, status: { not: 'CANCELLED' } },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true, units: true, bookings: true } },
      },
    });
    const tasks = await this.prisma.constructionTask.groupBy({ by: ['projectId', 'status'], where: { status: { notIn: ['DONE', 'CANCELLED'] } }, _count: { _all: true } });
    const now = Date.now();
    const dayMs = 86_400_000;

    const analysed = projects.map((p) => {
      const msProgress = p.milestones.length
        ? Math.round(p.milestones.reduce((s, m) => s + (m.progressPercent ?? 0), 0) / p.milestones.length)
        : 0;
      const openTasks = tasks.filter((t) => t.projectId === p.id).reduce((s, t) => s + t._count._all, 0);
      let expectedProgress = 100;
      if (p.startDate && p.endDate) {
        const total = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
        expectedProgress = total > 0 ? Math.min(100, Math.max(0, ((now - new Date(p.startDate).getTime()) / total) * 100)) : 100;
      }
      const gap = expectedProgress - msProgress;
      const risk = gap > 25 ? 'HIGH' : gap > 10 ? 'MEDIUM' : 'LOW';
      const delayedMilestones = p.milestones.filter((m) => m.status !== 'COMPLETED' && m.dueDate && new Date(m.dueDate).getTime() < now);
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        city: p.city,
        progress: msProgress,
        expectedProgress: Math.round(expectedProgress),
        delayRisk: risk,
        gap: Math.round(gap),
        openTasks,
        units: p._count.units,
        bookings: p._count.bookings,
        delayedMilestones: delayedMilestones.map((m) => ({ name: m.name, dueDate: m.dueDate, progress: m.progressPercent })),
        milestones: p.milestones.map((m) => ({ name: m.name, status: m.status, progress: m.progressPercent, dueDate: m.dueDate })),
      };
    });

    const narrative = await this.narrate(
      'Summarize project execution health, which projects are behind schedule and what to prioritise.',
      { projects: analysed.map((p) => ({ name: p.name, progress: p.progress, expected: p.expectedProgress, risk: p.delayRisk, tasks: p.openTasks })) },
    );

    return {
      engine: this.engine(),
      disclaimer: 'Delay-risk indicators are AI-generated estimates comparing milestone progress with calendar progress. Advisory only.',
      narrative,
      projects: analysed,
    };
  }

  async generateReport(prompt: string) {
    const lower = prompt.toLowerCase();
    const [trend, overview, leadsSummary, outstanding] = await Promise.all([
      toolSchemaFor('get_sales_and_collections_trend')!.run(this.prisma, { months: 12 }),
      toolSchemaFor('get_business_overview')!.run(this.prisma, {}),
      toolSchemaFor('get_leads_summary')!.run(this.prisma, {}),
      toolSchemaFor('get_outstanding_summary')!.run(this.prisma, { topCustomers: 5 }),
    ]);

    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, status: { not: 'CANCELLED' } },
      include: {
        milestones: true,
        bookings: { where: { deletedAt: null, status: { not: 'CANCELLED' } }, select: { totalPrice: true, salesExecutiveId: true, bookingDate: true } },
      },
    });
    const executives = await this.prisma.user.findMany({ select: { id: true, firstName: true, lastName: true } });
    const execName = new Map(executives.map((e) => [e.id, `${e.firstName} ${e.lastName ?? ''}`.trim()]));

    const perProject = projects.map((p) => ({
      name: p.name,
      code: p.code,
      status: p.status,
      bookings: p.bookings.length,
      salesValue: p.bookings.reduce((s, b) => s + Number(b.totalPrice ?? 0), 0),
      progress: p.milestones.length ? Math.round(p.milestones.reduce((s, m) => s + (m.progressPercent ?? 0), 0) / p.milestones.length) : 0,
    })).sort((a, b) => b.salesValue - a.salesValue);

    const byExec = new Map<string, { name: string; bookings: number; value: number }>();
    for (const p of projects) {
      for (const b of p.bookings) {
        const key = b.salesExecutiveId ?? 'unassigned';
        const entry = byExec.get(key) ?? { name: execName.get(key) ?? (key === 'unassigned' ? 'Unassigned' : key), bookings: 0, value: 0 };
        entry.bookings += 1;
        entry.value += Number(b.totalPrice ?? 0);
        byExec.set(key, entry);
      }
    }
    const topExecutives = [...byExec.values()].sort((a, b) => b.value - a.value).slice(0, 5);

    const data = { prompt, trend, overview, leads: leadsSummary, outstanding, projects: perProject, topExecutives };
    const narrative = await this.narrate(
      'You are generating a structured business report. Produce clear sections with headings as markdown bullets. Cover only what the request asks for.',
      data,
    );

    let offlineReport: string | null = null;
    if (!narrative) {
      const sections: string[] = [];
      const include = (k: string) => lower.includes(k);
      if (include('sales') || include('revenue') || include('booking')) {
        const rows = (trend as any[]).slice(-6);
        sections.push(`**Sales & collections (last ${rows.length} months)**\n` + rows.map((r) => `- ${r.month}: sales ${(r.sales / 100000).toFixed(1)}L, collections ${(r.collections / 100000).toFixed(1)}L`).join('\n'));
      }
      if (include('project') || include('compare')) {
        sections.push(`**Project performance**\n` + perProject.map((p) => `- ${p.name}: ${p.bookings} bookings, sales ${(p.salesValue / 100000).toFixed(1)}L, progress ${p.progress}%`).join('\n'));
      }
      if (include('executive') || include('team') || include('salesman') || include('top')) {
        sections.push(`**Top sales executives**\n` + (topExecutives.length ? topExecutives.map((e, i) => `${i + 1}. ${e.name} — ${e.bookings} bookings, ${(e.value / 100000).toFixed(1)}L`).join('\n') : 'No bookings attributed to executives yet.'));
      }
      if (include('lead') || include('pipeline') || include('crm')) {
        const ls = leadsSummary as any;
        sections.push(`**Pipeline**\n- ${ls.total} leads, ${ls.converted} converted (${ls.conversionRate}% conversion).\n- By status: ${(ls.byStatus ?? []).map((s: any) => `${s.status} ${s.count}`).join(', ')}`);
      }
      if (include('outstanding') || include('due') || include('receivable') || include('collection')) {
        const o = outstanding as any;
        sections.push(`**Receivables**\n- Outstanding: ${(o.totalOutstanding / 100000).toFixed(1)}L\n- Top debtors: ${(o.topCustomers ?? []).map((c: any) => `${c.customer} (${(c.amount / 100000).toFixed(1)}L)`).join(', ')}`);
      }
      if (!sections.length) {
        const ov = overview as any;
        sections.push(`**Business overview**\n- Projects: ${ov.projects} · Units: ${ov.units} · Bookings: ${ov.bookings}\n- Collections this month: ${(ov.collectionsThisMonth / 100000).toFixed(1)}L\n- Outstanding: ${(ov.outstanding / 100000).toFixed(1)}L\n- Open leads: ${ov.openLeads} · Customers: ${ov.customers}`);
      }
      offlineReport = `# Report\n\nGenerated from live ERP data on ${new Date().toISOString().slice(0, 10)}.\n\n` + sections.join('\n\n');
    }

    return {
      engine: this.engine(),
      prompt,
      disclaimer: 'This report was generated from your authorized ERP data. Figures are advisory snapshots - verify against the finance module for accounting decisions.',
      content: narrative ?? offlineReport,
      generatedAt: new Date().toISOString(),
    };
  }

  private async systemPrompt(): Promise<string> {
    const orgId = requireOrgId();
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }).catch(() => null);
    return [
      `You are EstateFlow AI, the business assistant embedded in a real-estate ERP used by ${org?.name ?? 'this organization'}.`,
      `Today is ${new Date().toISOString().slice(0, 10)}. Currency is Indian Rupees (INR).`,
      `Always use the provided tools to fetch real data before answering quantitative questions. Never invent numbers.`,
      `Answer concisely in markdown. Use short bullet points and bold key figures.`,
      `You only ever see data for the current organization; the tools are automatically scoped to it.`,
    ].join(' ');
  }

  private estimateTokens(text: string): number {
    return Math.max(1, Math.ceil((text?.length ?? 0) / 4));
  }
}
