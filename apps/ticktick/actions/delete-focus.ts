import type { ActionDefinition } from "@w6w/types";
import { encodeId, TickTickClient } from "../lib/client.ts";
import { focusOutput, focusTypeParam } from "../lib/params.ts";

/**
 * `DELETE /open/v1/focus/{focusId}?type=` — delete a focus record.
 *
 * Unlike the other deletes in this API, this one is documented as returning an
 * `OpenFocus` body (`{"id": "focus-1", "type": 0}` in TickTick's example), not
 * *No Content* — so it routes through `request()` rather than `status()`.
 *
 * `type` is required here for the same reason as on the read: it is part of the
 * address. Deleting with the wrong type addresses a different record.
 *
 * Deleting a focus record removes the tracked time from TickTick's statistics.
 * There is no create or update counterpart in the Open API — focus records can
 * only be read and deleted through it, never written.
 */
const deleteFocus: ActionDefinition<{ focusId: string; type: number }> = {
  key: "delete-focus",
  type: "perform",
  resource: "focus",
  title: "Delete Focus",
  description:
    "Delete a focus record. The Open API can read and delete focus records but never create or update one.",
  idempotent: true,
  params: [
    {
      key: "focusId",
      label: "Focus",
      type: "string",
      required: true,
      placeholder: "focus-1",
      hint: "The focus record id. Use List Focuses to find it.",
    },
    focusTypeParam,
  ],
  output: focusOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`/focus/${encodeId(input.focusId)}`, {
      method: "DELETE",
      query: { type: input.type },
    });
  },
};

export default deleteFocus;
