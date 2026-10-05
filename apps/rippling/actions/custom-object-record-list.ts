import type { ActionDefinition } from "@w6w/types";
import { cursorFromLink, encodeId, normalizeCursor, RipplingClient } from "../lib/client.ts";
import type { RipplingListBody } from "../lib/client.ts";
import { customObjectApiNameParam } from "../lib/custom-objects.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  customObjectApiName: string;
  limit?: number;
  cursor?: string;
}

const customObjectRecordList: ActionDefinition<Input> = {
  key: "custom-object-record-list",
  type: "read",
  resource: "custom-object-record",
  title: "List Custom Object Records",
  description:
    "One page of a custom object's records. Requires `custom-object-records.read` (or a read-write scope) on the API token. This endpoint takes only `limit` and `cursor`; to filter, use Query Custom Object Records.",
  params: [customObjectApiNameParam, limitParam, cursorParam],
  output: [
    { key: "results", type: "array", label: "Records on this page" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null on the last)" },
    { key: "nextLink", type: "string", label: "Rippling's next_link URL (null on the last page)" },
  ],
  async execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    const body = await new RipplingClient(ctx).json<RipplingListBody>(
      `/custom-objects/${encodeId(api)}/records/`,
      { query: { limit: input.limit, cursor: normalizeCursor(input.cursor) } },
    );
    const nextLink = body?.next_link ?? null;
    return {
      results: body?.results ?? [],
      nextCursor: cursorFromLink(nextLink),
      nextLink,
    };
  },
};

export default customObjectRecordList;
