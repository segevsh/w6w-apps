import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  includeLocale?: boolean;
}

const userGetMany: ActionDefinition<Input> = {
  key: "user-get-many",
  type: "read",
  resource: "user",
  title: "Get Many Users",
  description: "Lists workspace users (users.list).",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
    { key: "includeLocale", label: "Include locale", type: "boolean" },
  ],

  output: [
    { key: "ok", type: "boolean", label: "Succeeded" },
    { key: "members", type: "array", label: "Users" },
    { key: "cache_ts", type: "number", label: "Cache timestamp" },
    { key: "response_metadata", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/users.list", {
      query: {
        limit: input.limit ?? 100,
        cursor: input.cursor,
        include_locale: input.includeLocale,
      },
    });
  },
};

export default userGetMany;
