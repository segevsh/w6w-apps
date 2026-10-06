import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import {
  BACKGROUND_PARAM,
  helperBody,
  PERSON_PARAMS,
  recordOutput,
  REFERRER_PARAMS,
  TAG_OP_PARAMS,
} from "../lib/person.ts";

/**
 * Record Donation Helper: `POST /fundraising_pages/{id}/donations`. This RECORDS a donation that
 * happened elsewhere; it moves no money. Donations are not deduplicated, so a retry duplicates.
 */
const donationRecord: ActionDefinition<Input> = {
  key: "donation-record",
  type: "perform",
  resource: "donation",
  title: "Record Donation",
  description:
    "Record a donation made elsewhere against a fundraising page, creating or updating the donor in the same call. Moves no money. Donations are not deduplicated, so recording twice records two.",
  idempotent: false,
  params: [
    idParam("fundraisingPageId", "Fundraising page ID"),
    {
      key: "recipientName",
      label: "Recipient",
      type: "string",
      required: true,
      hint: "Display name of who received the donation.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      required: true,
      hint: 'A decimal string such as "3.00".',
    },
    { key: "recurring", label: "Recurring", type: "boolean" },
    {
      key: "period",
      label: "Recurrence period",
      type: "select",
      options: ["Weekly", "Monthly", "Quarterly", "Yearly"].map((v) => ({ value: v, label: v })),
      hint: "Used when Recurring is on.",
    },
    ...PERSON_PARAMS,
    ...TAG_OP_PARAMS,
    ...REFERRER_PARAMS,
    BACKGROUND_PARAM,
  ],
  output: recordOutput(
    { key: "amount", type: "string", label: "Total amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "recipients", type: "array", label: "{ display_name, amount }" },
  ),

  execute(input, ctx) {
    const extra: Record<string, unknown> = {
      recipients: [{
        display_name: need(input, "recipientName"),
        amount: String(need(input, "amount")),
      }],
    };
    if (input.recurring !== undefined) {
      extra["action_network:recurrence"] = {
        recurring: Boolean(input.recurring),
        ...(input.period ? { period: input.period } : {}),
      };
    }
    return new ActionNetworkClient(ctx).create(
      `/fundraising_pages/${seg(need(input, "fundraisingPageId"))}/donations`,
      helperBody(input, extra),
      input.backgroundRequest === true,
    );
  },
};

export default donationRecord;
