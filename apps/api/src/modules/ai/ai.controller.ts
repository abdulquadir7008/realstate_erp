import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import { paginationSchema } from '@re/shared';

const createConversationSchema = z.object({ title: z.string().trim().max(200).optional() });
const messageSchema = z.object({ content: z.string().trim().min(1).max(8000) });
const reportSchema = z.object({ prompt: z.string().trim().min(3).max(2000) });

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Get('status')
  @RequirePermissions('settings:read')
  status() {
    return this.service.status();
  }

  @Get('insights/leads')
  @RequirePermissions('settings:read')
  leadInsights() {
    return this.service.leadInsights();
  }

  @Get('insights/finance')
  @RequirePermissions('settings:read')
  financialInsights() {
    return this.service.financialInsights();
  }

  @Get('insights/projects')
  @RequirePermissions('settings:read')
  projectInsights() {
    return this.service.projectInsights();
  }

  @Post('reports/generate')
  @RequirePermissions('settings:read')
  generateReport(@Body(new ZodValidationPipe(reportSchema)) body: z.infer<typeof reportSchema>) {
    return this.service.generateReport(body.prompt);
  }

  @Get('conversations')
  @RequirePermissions('settings:read')
  listConversations(@Query() q: unknown) {
    return this.service.listConversations(parseQuery(paginationSchema, q));
  }

  @Post('conversations')
  @RequirePermissions('settings:create')
  createConversation(@Body(new ZodValidationPipe(createConversationSchema)) body: z.infer<typeof createConversationSchema>) {
    return this.service.createConversation(body.title);
  }

  @Get('conversations/:id')
  @RequirePermissions('settings:read')
  getConversation(@Param('id') id: string) {
    return this.service.getConversation(id);
  }

  @Post('conversations/:id/messages')
  @RequirePermissions('settings:create')
  addMessage(@Param('id') id: string, @Body(new ZodValidationPipe(messageSchema)) body: z.infer<typeof messageSchema>) {
    return this.service.addMessage(id, body.content);
  }

  @Delete('conversations/:id')
  @RequirePermissions('settings:manage')
  removeConversation(@Param('id') id: string) {
    return this.service.removeConversation(id);
  }

  @Get('usage')
  @RequirePermissions('settings:read')
  usage(@Query() q: unknown) {
    return this.service.usage(parseQuery(paginationSchema, q));
  }
}
