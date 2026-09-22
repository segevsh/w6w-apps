import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `GET /v1.0/communication/email?leadId={leadId}` — a lead's email history.
 *
 * Answers `{ emails: [...] }`. Each entry has `direction`, `eventType` ("Sent",
 * "Opened" or "Bounced"), `emailType` ("Manual" / "Auto"), `emailEventTime`,
 * `emailSubject` and `fromPond`.
 *
 * The id in each row is the email's own id, not the lead's; `currentId` pages
 * by id rather than offset.
 */
interface Input {
  leadId: number;
  limit?: number;
  offset?: number;
  currentId?: number;
}

const action: ActionDefinition<Input> = {
  key: "email-history",
  type: "read",
  resource: "communication",
  title: "Email History",
  description: "List a lead's email history (GET /v1.0/communication/email).",
  params: [
    leadIdParam,
    { key: "limit", label: "Limit", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "currentId",
      label: "Start from ID",
      type: "number",
      advanced: true,
      hint: "Page by id: retrieve entries sequentially from this id.",
    },
  ],
  output: [{ key: "emails", type: "array", label: "Email entries" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/communication/email", {
      query: {
        leadId: input.leadId,
        limit: input.limit,
        offset: input.offset,
        currentId: input.currentId,
      },
    });
  },
};

export default action;
