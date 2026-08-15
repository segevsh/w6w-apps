import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, toList } from "../lib/client.ts";
import { accountIdParam, leadStatusOptions } from "../lib/params.ts";

/**
 * `PUT /v3/a/{account_id}/calls/{call_id}.json` — Updating a Call.
 *
 * Add a tag or note, set lead status, rename the lead, or mark spam.
 *
 * The reference is explicit about `null`-vs-omit semantics: "If a field is
 * not included, its value will not be changed. If it is included but is null
 * or a blank string, the field will be cleared." This action only ever
 * *omits* an unset param (see `lib/client.ts`'s query/body filtering) rather
 * than sending an explicit `null`, so there is currently no way to clear
 * `note` or `value` through this action — clearing requires sending the
 * literal empty string, which is indistinguishable from "not provided" in a
 * form field. Left as a known gap rather than guessed at.
 *
 * `idempotent: true` — repeating the same update with the same field values
 * converges on the same call state (tags default to *replace*, not append,
 * unless `appendTags` is set).
 */
interface Input {
  accountId: string;
  callId: string;
  tags?: string;
  appendTags?: boolean;
  note?: string;
  value?: string;
  leadStatus?: "good_lead" | "not_a_lead";
  customerName?: string;
  spam?: boolean;
}

const callUpdate: ActionDefinition<Input> = {
  key: "call-update",
  type: "perform",
  resource: "call",
  title: "Update Call",
  description: "Tag or annotate a call, set its lead status, rename the lead, or mark it spam.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Calls or Get Call result.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names. New tags are created automatically if they don't " +
        "already exist in the company.",
    },
    {
      key: "appendTags",
      label: "Append tags",
      type: "boolean",
      hint: "On: add to the call's existing tags. Off (default): replace them.",
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: 'Monetary value of this call, e.g. "$1.00" or "1.00".',
    },
    {
      key: "leadStatus",
      label: "Lead status",
      type: "select",
      options: leadStatusOptions.filter((o) => o.value !== "not_scored"),
      hint: 'A call already marked "previously_marked_good_lead" cannot be set back to ' +
        "good_lead through this endpoint — CallRail returns 400.",
    },
    { key: "customerName", label: "Customer name", type: "string" },
    {
      key: "spam",
      label: "Mark as spam",
      type: "boolean",
      hint: "Removes the call from your call log, reports and billing (if in the current " +
        "billing cycle) and challenges the caller going forward. Cannot be undone via the API.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "customer_name", type: "string", label: "Customer name" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/calls/${encodeId(input.callId)}.json`,
      {
        method: "PUT",
        body: {
          tags: toList(input.tags),
          append_tags: input.appendTags,
          note: input.note,
          value: input.value,
          lead_status: input.leadStatus,
          customer_name: input.customerName,
          spam: input.spam,
        },
      },
    );
  },
};

export default callUpdate;
