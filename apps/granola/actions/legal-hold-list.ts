import type { ActionDefinition } from "@w6w/types";
import { GranolaClient, type GranolaLegalHold } from "../lib/client.ts";
import { cursorParam, pageSizeParam } from "../lib/params.ts";

/** `GET /v1/legal-holds` — newest first. Released holds are included, with `released_at` set. */
interface Input {
  cursor?: string;
  pageSize?: number;
}

const legalHoldList: ActionDefinition<Input> = {
  key: "legal-hold-list",
  type: "read",
  resource: "legal-hold",
  title: "List Legal Holds",
  description: "List legal holds, active and released.",
  params: [cursorParam, pageSizeParam(30, "legal holds")],
  output: [
    { key: "legal_holds", type: "array", label: "Legal holds" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<
      { legal_holds: GranolaLegalHold[]; hasMore: boolean; cursor: string | null }
    >("/legal-holds", { query: { cursor: input.cursor, page_size: input.pageSize } });
  },
};

export default legalHoldList;
