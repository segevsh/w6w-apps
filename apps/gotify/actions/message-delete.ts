import type { ActionDefinition } from "@w6w/types";
import { GotifyClient } from "../lib/client.ts";

/**
 * `DELETE /message/{id}` — verified against Gotify's OpenAPI document
 * (`deleteMessage`) and its handler (`api/message.go`, `DeleteMessage`), which
 * only requires a plain client token — unlike deleting an Application or a
 * Client, this is not gated behind an elevated session.
 */
const action: ActionDefinition = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete a message",
  description: "Permanently delete one message by id.",
  idempotent: true,
  params: [
    { key: "id", label: "Message ID", type: "number", required: true, validation: { min: 1 } },
    {
      key: "confirm",
      label: "I understand this cannot be undone",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (p.confirm !== true) throw new Error("`confirm` must be true to delete a message");
    const id = Number(p.id);

    ctx.log("warn", "deleting a Gotify message", { id });
    await new GotifyClient(ctx).request(`/message/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default action;
