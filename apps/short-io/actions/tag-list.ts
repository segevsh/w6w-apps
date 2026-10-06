import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  domainId: number;
  prefix?: string;
  limit?: number;
  pageToken?: string;
}

interface Result {
  tags: unknown[];
  nextPageToken: string | null;
}

/** GET /tags/{domainId} — cursor paginated; `limit` max 300. */
const tagList: ActionDefinition<Input, Result> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the tags used on a domain's links.",
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "prefix", label: "Prefix", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 300 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const res = await new ShortClient(ctx).request<
      { tags?: unknown[]; nextPageToken?: string | null }
    >(
      `/tags/${input.domainId}`,
      { query: { prefix: input.prefix, limit: input.limit ?? 100, pageToken: input.pageToken } },
    );
    return { tags: res.tags ?? [], nextPageToken: res.nextPageToken ?? null };
  },
};

export default tagList;
