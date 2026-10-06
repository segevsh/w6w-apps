import type { ActionDefinition } from "@w6w/types";
import { asStringArray, EzTextingClient } from "../lib/client.ts";
import { statusOutput } from "../lib/params.ts";

/** `DELETE /v1/messages` with a JSON body `{ids: [int64]}` — delete messages by ID. */
interface Input {
  ids: string[] | string;
}

const messageDelete: ActionDefinition<Input> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Messages",
  description: "Delete messages by ID.",
  idempotent: true,
  params: [{
    key: "ids",
    label: "Message IDs",
    type: "array",
    item: { type: "string" },
    required: true,
    hint: "Numeric message IDs (from List Messages); a comma-separated string is also accepted.",
  }],
  output: [{ key: "ids", type: "array", label: "Deleted IDs" }, ...statusOutput],

  async execute(input, ctx) {
    const ids = (asStringArray(input.ids) ?? []).map(Number);
    if (ids.length === 0 || ids.some((n) => !Number.isFinite(n))) {
      throw new Error("ids must be a non-empty list of numeric message IDs");
    }
    const status = await new EzTextingClient(ctx).status("/messages", {
      method: "DELETE",
      body: { ids },
    });
    return { ids, status };
  },
};

export default messageDelete;
