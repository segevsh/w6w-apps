import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta } from "../lib/client.ts";
import {
  accountIdParam,
  companyIdParam,
  dateRangeParams,
  fieldsParam,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/text-messages.json` — Listing All Conversations.
 *
 * Each conversation carries `recent_messages`, the two most recent messages
 * only — use Get Text Conversation for the full, paginated message history of
 * one conversation.
 */
interface Input {
  accountId: string;
  companyId?: string;
  search?: string;
  fields?: string;
  page?: number;
  perPage?: number;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}

const textMessageList: ActionDefinition<Input> = {
  key: "text-message-list",
  type: "search",
  resource: "text-message",
  title: "List Text Conversations",
  description: "List text-message conversations, newest first. Each result carries only the " +
    "two most recent messages — use Get Text Conversation for the full history.",
  params: [
    accountIdParam,
    companyIdParam,
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches customer_phone_number or customer_name.",
    },
    { ...fieldsParam, hint: "e.g. lead_status, source." },
    ...paginationParams(),
    ...dateRangeParams(),
  ],
  output: [
    { key: "conversations", type: "array", label: "Conversations" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching conversations" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<
      PageMeta & { conversations: unknown[] }
    >(
      `/a/${encodeId(input.accountId)}/text-messages.json`,
      {
        query: {
          company_id: input.companyId,
          search: input.search,
          fields: input.fields,
          page: input.page,
          per_page: input.perPage,
          date_range: input.startDate ? undefined : input.dateRange,
          start_date: input.startDate,
          end_date: input.endDate,
          time_zone: input.timeZone,
        },
      },
    );
    return {
      conversations: body.conversations,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default textMessageList;
