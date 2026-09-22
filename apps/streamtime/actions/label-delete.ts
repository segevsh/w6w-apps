import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /labels/{label_id}` — delete a label.
 *
 * The id is the **label** id (the attachment), not the master label id, so this
 * removes the label from one entity rather than from the organisation.
 */
interface Input {
  labelId: number;
}

const labelDelete: ActionDefinition<Input, { deleted: boolean; status: number }> = {
  key: "label-delete",
  type: "perform",
  resource: "label",
  title: "Delete Label",
  description: "Delete a label by id.",
  idempotent: true,
  params: [idParam("labelId", "Label ID", "The label id, not the master label id.")],
  output: [
    { key: "deleted", type: "boolean", label: "The delete request succeeded" },
    { key: "status", type: "number", label: "HTTP status Streamtime answered with" },
  ],

  async execute(input, ctx) {
    const status = await new StreamtimeClient(ctx).status(`/labels/${encodeId(input.labelId)}`, {
      method: "DELETE",
    });
    return { deleted: true, status };
  },
};

export default labelDelete;
