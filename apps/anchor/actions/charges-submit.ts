import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, asJson, compact, encodeId } from "../lib/client.ts";

/** `POST /billing/{agreementId}/submit` — Anchor operation `submitCharges`. */
interface Input {
  agreementId: string;
  billingDetails: unknown;
  servicesListedInAgreement?: unknown;
  outOfScopeCharges?: unknown;
  adHocData?: unknown;
  attachments?: unknown;
}

function parseJson(value: unknown, label: string): unknown {
  return asJson(value, label);
}

const chargesSubmit: ActionDefinition<Input> = {
  key: "charges-submit",
  type: "perform",
  resource: "charge",
  title: "Submit Charges",
  description:
    "Submit charges for an agreement to generate an invoice now (bill_now) or on a future date (schedule_bill).",
  idempotent: false,
  params: [
    { key: "agreementId", label: "Agreement ID", type: "string", required: true },
    {
      key: "billingDetails",
      label: "Billing details",
      type: "json",
      required: true,
      hint: '{"type": "bill_now" | "schedule_bill", "issueDate": "yyyy-MM-dd"}',
    },
    {
      key: "servicesListedInAgreement",
      label: "Services listed in agreement",
      type: "json",
      hint:
        "Array of manual services already on the agreement to bill (api.ServiceToBill in the vendor spec).",
    },
    {
      key: "outOfScopeCharges",
      label: "Out-of-scope charges",
      type: "json",
      hint: "Array of ad-hoc charges, each referencing a service template ID.",
    },
    {
      key: "adHocData",
      label: "Ad-hoc invoice data",
      type: "json",
      hint: "Required by Anchor for ad-hoc agreements: net terms, notify and payment collection.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "Array of invoice attachments.",
    },
  ],
  output: [
    { key: "adHocChargesIds", type: "array", label: "Created ad-hoc charge IDs" },
    { key: "serviceBillCommandsIds", type: "array", label: "Created service bill command IDs" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", `/billing/${encodeId(input.agreementId)}/submit`, {
      body: compact({
        billingDetails: parseJson(input.billingDetails, "billingDetails"),
        servicesListedInAgreement:
          input.servicesListedInAgreement === undefined || input.servicesListedInAgreement === ""
            ? undefined
            : parseJson(input.servicesListedInAgreement, "servicesListedInAgreement"),
        outOfScopeCharges: input.outOfScopeCharges === undefined || input.outOfScopeCharges === ""
          ? undefined
          : parseJson(input.outOfScopeCharges, "outOfScopeCharges"),
        adHocData: input.adHocData === undefined || input.adHocData === ""
          ? undefined
          : parseJson(input.adHocData, "adHocData"),
        attachments: input.attachments === undefined || input.attachments === ""
          ? undefined
          : parseJson(input.attachments, "attachments"),
      }),
    });
  },
};

export default chargesSubmit;
