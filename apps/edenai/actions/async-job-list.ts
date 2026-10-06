import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient } from "../lib/client.ts";

/** `GET /v3/universal-ai/async` - page-numbered (`page` from 1, `limit` 1-1000, vendor default 100). */
interface Input {
  feature?: string;
  subfeature?: string;
  status?: string;
  page?: number;
  limit?: number;
}

const asyncJobList: ActionDefinition<Input> = {
  key: "async-job-list",
  type: "search",
  resource: "async-job",
  title: "List Async Jobs",
  description: "List your async Universal AI jobs, optionally filtered by feature or status.",
  params: [
    { key: "feature", label: "Feature", type: "string" },
    { key: "subfeature", label: "Subfeature", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "processing", label: "Processing" },
        { value: "success", label: "Success" },
        { value: "fail", label: "Fail" },
      ],
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      default: 20,
      hint: "The vendor default is 100 and its maximum 1000; this form asks for 20.",
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Jobs (public_id, status, feature, subfeature, provider, model, created_at)",
    },
    { key: "total", type: "number", label: "Total matching jobs" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<
      { items?: unknown[]; total?: number; page?: number; limit?: number; total_pages?: number }
    >("/universal-ai/async", {
      query: compact({
        feature: input.feature,
        subfeature: input.subfeature,
        status: input.status,
        page: input.page ?? 1,
        limit: input.limit ?? 20,
      }),
    });
    return {
      items: res.items ?? [],
      total: res.total,
      page: res.page,
      limit: res.limit,
      totalPages: res.total_pages,
    };
  },
};

export default asyncJobList;
