import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/transactions` — Record a payment transaction.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  value: number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  description?: string;
  source?: string;
  updatedBy?: string;
}

const transactionCreate: ActionDefinition<Input> = {
  key: "transaction-create",
  type: "perform",
  resource: "transaction",
  title: "Create transaction",
  description: "Record a payment transaction.",
  idempotent: false,
  params: [
    {
      key: "value",
      label: "Value",
      type: "number",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [{ value: "Zapier", label: "Zapier" }, { value: "Stripe", label: "Stripe" }, {
        value: "Make",
        label: "Make",
      }, { value: "Other", label: "Other" }],
    },
    {
      key: "updatedBy",
      label: "Updated by",
      type: "string",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "status", type: "number", label: "Status" },
    { key: "data", type: "object", label: "{transaction}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/transactions", {
      method: "POST",
      body: compact({
        value: input.value,
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
        description: input.description,
        source: input.source,
        updatedBy: input.updatedBy,
      }),
    });
  },
};

export default transactionCreate;
