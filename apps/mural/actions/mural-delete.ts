import type { ActionDefinition } from "@w6w/types";
import { encodeId, none } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `DELETE /murals/{muralId}` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
};

const muralDelete: ActionDefinition<Input> = {
  key: "mural-delete",
  type: "perform",
  resource: "mural",
  title: "Delete Mural",
  description: "Delete a mural. Irreversible. Needs the `murals:write` OAuth scope.",
  idempotent: true,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "true when the mural was deleted" },
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  execute(input, ctx) {
    return none(ctx, "DELETE", `/murals/${encodeId(input.muralId)}`, {}, String(input.muralId));
  },
};

export default muralDelete;
