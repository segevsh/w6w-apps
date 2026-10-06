import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/outcomes` — Upsert a call's outcome, optionally with a new deal.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  eventCallId: number;
  outcome: string;
  noSaleReason?: string;
  notes?: string;
  objection?: string;
  newDeal?: unknown;
}

const outcomeSet: ActionDefinition<Input> = {
  key: "outcome-set",
  type: "perform",
  resource: "call",
  title: "Set call outcome",
  description: "Upsert a call's outcome, optionally with a new deal.",
  idempotent: true,
  params: [
    {
      key: "eventCallId",
      label: "Call ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "outcome",
      label: "Outcome",
      type: "select",
      options: [{ value: "WON", label: "Won" }, { value: "NO_SALE", label: "No sale" }, {
        value: "APPROVED",
        label: "Approved",
      }, { value: "REJECTED", label: "Rejected" }],
      required: true,
    },
    {
      key: "noSaleReason",
      label: "No-sale reason",
      type: "select",
      options: [
        { value: "FOLLOW_UP_SCHEDULE", label: "Follow Up Schedule" },
        { value: "UNQUALIFIED", label: "Unqualified" },
        { value: "NO_SHOW", label: "No Show" },
        { value: "CONTACT_CANCELLED", label: "Contact Cancelled" },
        { value: "ADMIN_CANCELLED", label: "Admin Cancelled" },
        { value: "NOT_INTERESTED", label: "Not Interested" },
        { value: "BAD_FIT", label: "Bad Fit" },
        { value: "OTHER", label: "Other" },
      ],
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
    },
    {
      key: "objection",
      label: "Objection",
      type: "select",
      options: [
        { value: "MONEY", label: "Money" },
        { value: "LOGISTIC", label: "Logistic" },
        { value: "PARTNER", label: "Partner" },
        { value: "FEAR", label: "Fear" },
        { value: "SMOKE_SCREEN", label: "Smoke Screen" },
        { value: "NO_OBJECTION", label: "No Objection" },
      ],
    },
    {
      key: "newDeal",
      label: "New deal",
      type: "json",
      hint:
        'JSON object: {"value","transactionType","productId","date","transactionIds"}; add "id" to update an existing deal.',
    },
  ],
  output: [
    { key: "data", type: "object", label: "{id, noSaleReason, objection, updatedAt}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/outcomes", {
      method: "POST",
      body: compact({
        eventCallId: input.eventCallId,
        outcome: input.outcome,
        noSaleReason: input.noSaleReason,
        notes: input.notes,
        objection: input.objection,
        newDeal: asOptionalJson(input.newDeal, "New deal"),
      }),
    });
  },
};

export default outcomeSet;
