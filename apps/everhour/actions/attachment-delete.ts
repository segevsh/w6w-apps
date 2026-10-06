import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /attachments/{attachmentId}` — Delete an attachment.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  attachmentId: number;
}

const attachmentDelete: ActionDefinition<Input> = {
  key: "attachment-delete",
  type: "perform",
  resource: "attachment",
  title: "Delete Attachment",
  description: "Delete an attachment.",
  idempotent: true,
  params: [
    {
      key: "attachmentId",
      label: "Attachment ID",
      type: "number",
      required: true,
      hint: "Numeric attachment id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/attachments/${encodeId(input.attachmentId)}`, {
      method: "DELETE",
    });
  },
};

export default attachmentDelete;
