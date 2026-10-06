import type { ActionDefinition } from "@w6w/types";
import { compact, LIMIT_PARAM, NinoxClient, OFFSET_PARAM } from "../lib/client.ts";

/**
 * `GET /workspace/{workspaceId}/schema/changes` — the module/table/field change log for
 * incremental sync. `since` is required by the vendor (400 without it).
 */
interface Input {
  since: string;
  asOf?: string;
  limit?: number;
  offset?: number;
}

interface Output {
  changes: unknown[];
  hasMore: boolean;
  asOf?: string;
  retentionCutoff?: string | null;
}

const schemaChangesList: ActionDefinition<Input, Output> = {
  key: "schema-changes-list",
  type: "read",
  resource: "schema",
  title: "List Schema Changes",
  description:
    "List created/updated/deleted/restored modules, tables and fields since a timestamp. Pass " +
    "the result's asOf as `since` on the next poll; when paging, pass the first page's asOf back " +
    "as `asOf`.",
  params: [
    {
      key: "since",
      label: "Since",
      type: "string",
      required: true,
      placeholder: "2026-01-01T00:00:00Z",
      hint: "ISO 8601 UTC timestamp ending in Z.",
    },
    {
      key: "asOf",
      label: "Pin window (asOf)",
      type: "string",
      hint: "Only for page 2+ of one poll: the asOf the first page returned.",
    },
    LIMIT_PARAM,
    OFFSET_PARAM,
  ],
  output: [
    { key: "changes", type: "array", label: "Changes (oldest first)" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "asOf", type: "string", label: "Next `since` value" },
    { key: "retentionCutoff", type: "string", label: "Oldest change still readable" },
  ],

  async execute(input, ctx) {
    const env = await new NinoxClient(ctx).call<unknown[]>("/schema/changes", {
      query: compact({
        since: input.since,
        asOf: input.asOf,
        limit: input.limit,
        offset: input.offset,
      }) as Record<string, string | number>,
    });
    return {
      changes: Array.isArray(env.data) ? env.data : [],
      hasMore: env.page_info?.has_more === true,
      asOf: env.meta?.asOf as string | undefined,
      retentionCutoff: env.meta?.retentionCutoff as string | null | undefined,
    };
  },
};

export default schemaChangesList;
