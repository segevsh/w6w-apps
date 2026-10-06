import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  LIMIT_PARAM,
  MODULE_PARAM,
  NinoxClient,
  OFFSET_PARAM,
  TABLE_PARAM,
} from "../lib/client.ts";

/**
 * `GET .../tables/{tableName}/records/changes` — created/updated/deleted rows since a timestamp.
 * Only for tables with history tracking enabled; the vendor answers 400 otherwise.
 */
interface Input {
  moduleName: string;
  tableName: string;
  since: string;
  asOf?: string;
  limit?: number;
  offset?: number;
}

interface Output {
  changes: Array<{ id: string; changeType: string; changedAt: string }>;
  hasMore: boolean;
  asOf?: string;
}

const recordChangesList: ActionDefinition<Input, Output> = {
  key: "record-changes-list",
  type: "read",
  resource: "record",
  title: "List Record Changes",
  description: "List record ids created, updated or deleted since a timestamp (incremental " +
    "sync). The table must have history tracking enabled. Pass the result's asOf as `since` on " +
    "the next poll.",
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
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
    { key: "changes", type: "array", label: "Changes ({id, changeType, changedAt})" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "asOf", type: "string", label: "Next `since` value" },
  ],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const env = await client.call<Output["changes"]>(`${client.tablePath(input)}/records/changes`, {
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
    };
  },
};

export default recordChangesList;
