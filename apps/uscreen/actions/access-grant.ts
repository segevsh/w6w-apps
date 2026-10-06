import type { ActionDefinition } from "@w6w/types";
import { compact, seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
  productId: number;
  productType: string;
  performActionAt?: number;
  withManualBilling?: boolean;
  skipAutomations?: boolean;
}

const accessGrant: ActionDefinition<Input> = {
  key: "access-grant",
  type: "perform",
  resource: "access",
  title: "Grant Access",
  description:
    "Grant a customer access to a product. Rent and recurring types take a next-action date; with manual billing, omit it.",
  idempotent: false,
  params: [
    CUSTOMER_ID(""),
    {
      "key": "productId",
      "label": "Product ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
    {
      "key": "productType",
      "label": "Product type",
      "type": "select",
      "required": true,
      "hint": "program (bundle), recurring (subscription), rent, freebie or fixed_price.",
      "options": [
        { "value": "program", "label": "Program" },
        { "value": "recurring", "label": "Recurring" },
        { "value": "rent", "label": "Rent" },
        { "value": "freebie", "label": "Freebie" },
        { "value": "fixed_price", "label": "Fixed price" },
      ],
    },
    {
      "key": "performActionAt",
      "label": "Next action at (Unix seconds)",
      "type": "number",
      "hint":
        "Next due date for recurring, or access termination for rent. Blank lets Uscreen choose. Do not send with manual billing.",
    },
    {
      "key": "withManualBilling",
      "label": "Manual billing",
      "type": "boolean",
      "hint": "Process billing outside Uscreen. Only valid when the product type is an offer.",
    },
    {
      "key": "skipAutomations",
      "label": "Skip automations",
      "type": "boolean",
      "hint": "True to skip automation enrollment such as bundle_assigned.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/customers/${seg(input.customerId)}/accesses`,
      {
        body: compact({
          "product_id": input.productId,
          "product_type": input.productType,
          "perform_action_at": input.performActionAt === undefined
            ? undefined
            : String(input.performActionAt),
          "with_manual_billing": input.withManualBilling,
          "skip_automations": input.skipAutomations,
        }),
      },
    )) ?? {};
  },
};

export default accessGrant;
