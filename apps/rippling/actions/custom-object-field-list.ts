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

const customObjectFieldList: ActionDefinition<Input> = {
  key: "custom-object-field-list",
  type: "read",
  resource: "custom-object-field",
  title: "List Custom Object Fields",
  description:
    "The field definitions of one custom object. Requires a `custom-objects.read` scope (or a read-write scope) on the API token.",
  params: [customObjectApiNameParam, limitParam, cursorParam],
  output: [
    { key: "results", type: "array", label: "Field definitions on this page" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null on the last)" },
    { key: "nextLink", type: "string", label: "Rippling's next_link URL (null on the last page)" },
  ],
  async execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    const body = await new RipplingClient(ctx).json<RipplingListBody>(
      `/custom-objects/${encodeId(api)}/fields/`,
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

export default customObjectFieldList;
