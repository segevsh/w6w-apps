import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput, bodyJsonParam, bodyTextParam } from "../lib/params.ts";
import { resolveBody } from "../lib/tiptap.ts";

/**
 * `POST /messages` — send a direct message, or open a group chat.
 *
 * ## One recipient or several, but the field name changes
 *
 * The schema's `oneOf` is explicit: either `{ user_email, rich_text_body }` or
 * `{ user_emails, rich_text_body }`. Singular and plural are *different
 * properties*, not one field that tolerates an array, and Circle's messaging
 * model is why — a single address opens a direct message, a list opens a group
 * chat room (`/get-started/concepts/messages` describes direct messages, group
 * chat rooms and chat spaces as three distinct things).
 *
 * This action takes one comma-separated `recipients` field and picks the
 * property from the count, because "send this to these people" is one intent
 * and asking a workflow author to choose the right field name for it is asking
 * them to know Circle's schema. Exactly one address sends `user_email`; two or
 * more send `user_emails`. Sending a one-element `user_emails` array would be
 * the plausible-looking choice and is not obviously the same thing — a group
 * chat with one participant is not a DM — so the singular is used where the
 * singular applies.
 *
 * ## The body is `rich_text_body`, not `tiptap_body`
 *
 * Same document shape, different property name from `POST /posts`. Circle
 * documents it separately (`/get-started/concepts/rich-text-body`) because it
 * carries the attachment sidecars — `attachments`, `inline_attachments`,
 * `sgids_to_object_map`, `polls`. Those take signed ids from Circle's
 * direct-upload flow and cannot be synthesised here, but a caller who already
 * has them can supply the whole object through the JSON param: `resolveBody`
 * passes an already-wrapped document through with its extra keys intact,
 * precisely so that escape hatch works.
 *
 * Not idempotent: a message is an event, and a retry sends it twice.
 */
interface Input {
  recipients: string;
  text?: string;
  bodyJson?: unknown;
}

const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send a direct message to one member, or open a group chat with several. Bodies are TipTap " +
    "documents; plain text is wrapped for you.",
  idempotent: false,
  params: [
    {
      key: "recipients",
      label: "Recipient emails",
      type: "string",
      required: true,
      placeholder: "alice@example.com, bob@example.com",
      hint: "One address sends a direct message; two or more open a group chat room. Circle uses " +
        "different fields for the two cases and this picks the right one.",
    },
    bodyTextParam,
    bodyJsonParam,
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    const emails = input.recipients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (emails.length === 0) throw new Error("Send Message: at least one recipient is required");

    const body: Record<string, unknown> = {
      rich_text_body: resolveBody(input.text, input.bodyJson, "Message body"),
    };
    // Singular vs plural is a schema-level `oneOf`, not a convenience.
    if (emails.length === 1) body.user_email = emails[0];
    else body.user_emails = emails;

    return new CircleClient(ctx).request("/messages", { method: "POST", body });
  },
};

export default messageCreate;
