import type { ActionDefinition } from "@w6w/types";
import { list, pick } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

/**
 * `GET /workspaces` (Mural public API v1). OAuth scope: `workspaces:read`.
 */
type Input = {
  limit?: number;
  next?: string;
};

const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "List the workspaces the user belongs to. Needs the `workspaces:read` OAuth scope.",
  params: [
    int("limit", "Limit", {
      hint: "Maximum results per page (the vendor rejects values of 100 or more).",
    }),
    str("next", "Next page token", {
      hint: "The `next` token from the previous page. Tokens expire (NEXT_TOKEN_EXPIRED).",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "The page of results" },
    { key: "next", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  execute(input, ctx) {
    return list(ctx, "GET", `/workspaces`, { query: pick(input, ["limit", "next"]) });
  },
};

export default workspaceList;
