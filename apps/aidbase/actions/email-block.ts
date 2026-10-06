import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Block Email — Block an email so its sender can no longer interact. Needs an API key with the EMAILINBOXES_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  emailId: string;
}

const emailBlock: ActionDefinition<Input> = {
  key: "email-block",
  type: "perform",
  resource: "email",
  title: "Block Email",
  description:
    "Block an email so its sender can no longer interact. Needs an API key with the EMAILINBOXES_WRITE scope.",
  idempotent: true,
  params: [
    {
      "key": "emailInboxId",
      "label": "Email Inbox ID",
      "type": "string",
      "required": true,
      "hint": "The inbox ID.",
    },
    {
      "key": "emailId",
      "label": "Email ID",
      "type": "string",
      "required": true,
      "hint": "From List Emails.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Blocked targets, each { target, targetType, status }",
    },
    {
      "key": "failed",
      "type": "array",
      "label": "Targets that could not be blocked",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/email-inbox/${encodeId(input.emailInboxId)}/emails/${encodeId(input.emailId)}/block`,
      { method: "PUT" },
    );
  },
};

export default emailBlock;
