import type { ActionDefinition } from "@w6w/types";
import { GotifyClient, num } from "../lib/client.ts";
import { APPLICATION_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /message`, or `DELETE /application/{id}/message` when
 * `applicationId` is set — verified against Gotify's OpenAPI document
 * (`deleteMessages`, `deleteAppMessages`). Neither is gated behind an
 * elevated session, unlike deleting the Application or Client resource
 * itself.
 *
 * There is no undo and no confirmation prompt on Gotify's side — the delete
 * happens the instant the request lands — so `confirm` is required here.
 */
const action: ActionDefinition = {
  key: "message-delete-all",
  type: "perform",
  resource: "message",
  title: "Delete all messages",
  description: "Permanently delete every message, or every message for one application.",
  idempotent: true,
  params: [
    {
      ...APPLICATION_ID_PARAM,
      hint: "Blank deletes every message on the connection's account, not just one application.",
    },
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
    if (p.confirm !== true) throw new Error("`confirm` must be true to delete messages");
    const applicationId = num(p.applicationId);
    const path = applicationId
      ? `/application/${encodeURIComponent(String(applicationId))}/message`
      : "/message";

    ctx.log("warn", "deleting all Gotify messages", { applicationId });
    await new GotifyClient(ctx).request(path, { method: "DELETE" });
    return { deleted: true };
  },
};

export default action;
