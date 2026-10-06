import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Update Email — Change an email's status and/or priority. At least one is required, and Aidbase rejects any other field. Needs the EMAILS_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  emailId: string;
  status?: string;
  priority?: string;
}

const emailUpdate: ActionDefinition<Input> = {
  key: "email-update",
  type: "perform",
  resource: "email",
  title: "Update Email",
  description:
    "Change an email's status and/or priority. At least one is required, and Aidbase rejects any other field. Needs the EMAILS_WRITE scope.",
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
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "open",
          "label": "open",
        },
        {
          "value": "assigned",
          "label": "assigned",
        },
        {
          "value": "need_more_info",
          "label": "need_more_info",
        },
        {
          "value": "resolved",
          "label": "resolved",
        },
        {
          "value": "closed",
          "label": "closed",
        },
      ],
    },
    {
      "key": "priority",
      "label": "Priority",
      "type": "string",
      "hint": "For example low, medium or high.",
    },
  ],
  output: [
    {
      "key": "ok",
      "type": "boolean",
      "label": "True when Aidbase answered success",
    },
  ],

  execute(input, ctx) {
    if (input.status === undefined && input.priority === undefined) {
      return Promise.reject(new Error("Aidbase: give at least one of status or priority"));
    }
    return new AidbaseClient(ctx).done(
      `/email-inbox/${encodeId(input.emailInboxId)}/emails/${encodeId(input.emailId)}`,
      { method: "PUT", body: compact({ status: input.status, priority: input.priority }) },
    );
  },
};

export default emailUpdate;
