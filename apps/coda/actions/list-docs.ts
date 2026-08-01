import type { ActionDefinition } from "@w6w/types";
import { CodaClient, type CodaListResponse } from "../lib/client.ts";

interface Input {
  workspaceId?: string;
  query?: string;
  isOwner?: boolean;
  isPublished?: boolean;
  limit?: number;
  pageToken?: string;
}

interface Doc {
  id: string;
  type: string;
  href: string;
  name: string;
  ownerName?: string;
  workspaceId?: string;
}

/**
 * GET /docs — list docs the token's account can see. Coda rate-limits this
 * one tighter than other reads (4 req/6s per the docs), so pagination via
 * `pageToken` matters more here than elsewhere.
 */
const listDocs: ActionDefinition<Input, CodaListResponse<Doc>> = {
  key: "list-docs",
  type: "read",
  resource: "doc",
  title: "List Docs",
  description:
    "List docs accessible by the connected account. Returns one page — pass `pageToken` back to walk.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      hint: "Filter to docs in this workspace.",
    },
    {
      key: "query",
      label: "Search query",
      type: "string",
      hint: "Search term to filter docs by name.",
    },
    { key: "isOwner", label: "Owned by me only", type: "boolean" },
    { key: "isPublished", label: "Published only", type: "boolean" },
    { key: "limit", label: "Page size", type: "number", default: 25 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Docs" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<CodaListResponse<Doc>>("/docs", {
      query: {
        workspaceId: input.workspaceId,
        query: input.query,
        isOwner: input.isOwner,
        isPublished: input.isPublished,
        limit: input.limit ?? 25,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listDocs;
