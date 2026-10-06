import type { ActionDefinition } from "@w6w/types";
import { compact, PaystackClient, required } from "../lib/client.ts";

/** `POST /transferrecipient`. */
interface Input {
  type: string;
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

const transferRecipientCreate: ActionDefinition<Input> = {
  key: "transfer-recipient-create",
  type: "perform",
  resource: "transfer-recipient",
  title: "Create Transfer Recipient",
  description: "Register a bank or mobile-money account as a payout recipient.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      hint: "nuban (Nigeria), ghipss (Ghana bank), mobile_money, basa (South Africa).",
      options: ["nuban", "ghipss", "mobile_money", "basa"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "name", label: "Recipient name", type: "string", required: true },
    { key: "accountNumber", label: "Account number", type: "string", required: true },
    {
      key: "bankCode",
      label: "Bank code",
      type: "string",
      required: true,
      hint: "From List Banks (`code`).",
    },
    { key: "currency", label: "Currency", type: "string" },
    { key: "description", label: "Description", type: "string" },
    { key: "metadata", label: "Metadata", type: "json" },
  ],
  output: [
    { key: "recipient_code", type: "string", label: "Recipient code" },
    { key: "name", type: "string", label: "Name" },
    { key: "details", type: "object", label: "Bank details" },
  ],
  async execute(input, ctx) {
    return await new PaystackClient(ctx).data("/transferrecipient", {
      method: "POST",
      body: compact({
        type: required(input.type, "Type"),
        name: required(input.name, "Recipient name"),
        account_number: required(input.accountNumber, "Account number"),
        bank_code: required(input.bankCode, "Bank code"),
        currency: input.currency,
        description: input.description,
        metadata: input.metadata,
      }),
    });
  },
};

export default transferRecipientCreate;
