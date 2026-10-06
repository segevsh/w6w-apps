import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Email Inbox — Fetch one email inbox.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
}

const emailInboxGet: ActionDefinition<Input> = {
  key: "email-inbox-get",
  type: "read",
  resource: "email-inbox",
  title: "Get Email Inbox",
  description: "Fetch one email inbox.",
  params: [
    {
      "key": "emailInboxId",
      "label": "Email Inbox ID",
      "type": "string",
      "required": true,
      "hint": "The inbox ID; for the knowledge endpoints Aidbase also accepts the inbox alias.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Inbox ID",
    },
    {
      "key": "alias",
      "type": "string",
      "label": "Inbox alias",
    },
    {
      "key": "title",
      "type": "string",
      "label": "Title",
    },
    {
      "key": "description",
      "type": "string",
      "label": "Description",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/email-inbox/${encodeId(input.emailInboxId)}`);
  },
};

export default emailInboxGet;
