import type { ActionDefinition } from "@w6w/types";
import { ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  domainId: number;
  limit?: number;
  pageToken?: string;
  folderId?: string;
  afterDate?: string;
  beforeDate?: string;
  dateSortOrder?: string;
}

interface Result {
  links: ShortLink[];
  count: number;
  nextPageToken: string | null;
}

/**
 * GET /api/links — the path really is `/api/links` while every other link route
 * is `/links/…`. Takes the numeric `domain_id` (not the hostname). Cursor
 * paginated: `nextPageToken` is null on the last page. `limit` is capped at 150.
 */
const linkList: ActionDefinition<Input, Result> = {
  key: "link-list",
  type: "search",
  resource: "link",
  title: "List Links",
  description: "List the links on a domain, newest first by default. Returns one page.",
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The numeric `id` from List Domains.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 150 },
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "`nextPageToken` from the previous page.",
    },
    { key: "folderId", label: "Folder ID", type: "string" },
    { key: "afterDate", label: "Created after", type: "string", hint: "ISO 8601 date-time." },
    { key: "beforeDate", label: "Created before", type: "string", hint: "ISO 8601 date-time." },
    {
      key: "dateSortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }],
    },
  ],
  output: [
    { key: "links", type: "array", label: "Links" },
    { key: "count", type: "number", label: "Total matching links" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const res = await new ShortClient(ctx).request<
      { links?: ShortLink[]; count?: number; nextPageToken?: string | null }
    >("/api/links", {
      query: {
        domain_id: input.domainId,
        limit: input.limit ?? 50,
        pageToken: input.pageToken,
        folderId: input.folderId,
        afterDate: input.afterDate,
        beforeDate: input.beforeDate,
        dateSortOrder: input.dateSortOrder,
      },
    });
    return {
      links: (res.links ?? []).map(stripPassword),
      count: res.count ?? 0,
      nextPageToken: res.nextPageToken ?? null,
    };
  },
};

export default linkList;
