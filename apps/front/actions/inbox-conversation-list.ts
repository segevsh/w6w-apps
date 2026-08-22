import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_STATUSES, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /inboxes/{inbox_id}/conversations` — verified against Front's own
 * OpenAPI document (`list-inbox-conversations`).
 *
 * The queue for one inbox, which is what most workflows actually want:
 * "everything unassigned in Support" is this call with `unassigned`, while the
 * company-wide list would drag in billing, sales and every private thread the
 * token can see.
 *
 * It is also the cheaper question. Filtering a company-wide list down to one
 * inbox in the workflow pages through everything first; this filters at Front,
 * and Front's rate limit is per company.
 */
const action: ActionDefinition = {
  key: "inbox-conversation-list",
  type: "read",
  resource: "inbox",
  title: "List an inbox's conversations",
  description:
    "One inbox's queue, filtered by status at Front rather than after the fact — the cheap way " +
    "to ask 'what is unassigned in Support'.",
  params: [
    {
      key: "inboxId",
      label: "Inbox ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "inb_55c8c149",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      default: [],
      options: CONVERSATION_STATUSES,
      hint: "Leave empty for every status. Open work is `assigned` plus `unassigned`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "assignee", type: "object", label: "Assignee" },
    { key: "recipient", type: "object", label: "Recipient" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const inboxId = String(p.inboxId ?? "");
    if (!inboxId) throw new Error("`inboxId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const statuses = Array.isArray(p.statuses) ? p.statuses as string[] : [];

    return await new FrontClient(ctx).requestAll(
      `/inboxes/${encodeURIComponent(inboxId)}/conversations`,
      { q: { statuses } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
