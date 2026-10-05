import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient, type GranolaLegalHoldCustodian } from "../lib/client.ts";
import { cursorParam, holdIdParam, pageSizeParam } from "../lib/params.ts";

/** `GET /v1/legal-holds/{hold_id}/custodians` — oldest first; removed custodians stay, with `removed_at`. */
interface Input {
  holdId: string;
  cursor?: string;
  pageSize?: number;
}

const custodianList: ActionDefinition<Input> = {
  key: "custodian-list",
  type: "read",
  resource: "legal-hold",
  title: "List Legal Hold Custodians",
  description: "List the users a hold names, including removed ones (with removed_at).",
  params: [holdIdParam, cursorParam, pageSizeParam(30, "custodians")],
  output: [
    { key: "custodians", type: "array", label: "Custodian entries" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<
      { custodians: GranolaLegalHoldCustodian[]; hasMore: boolean; cursor: string | null }
    >(`/legal-holds/${encodeId(input.holdId)}/custodians`, {
      query: { cursor: input.cursor, page_size: input.pageSize },
    });
  },
};

export default custodianList;
