import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, LobClient, stripBankSecrets } from "../lib/client.ts";

interface Input {
  routingNumber: string;
  accountNumber: string;
  accountType: string;
  signatory: string;
  description?: string;
  metadata?: unknown;
}

const bankAccountCreate: ActionDefinition<Input> = {
  key: "bank-account-create",
  type: "perform",
  resource: "bank-account",
  title: "Create Bank Account",
  description:
    "Register a US bank account that checks can be drawn on. It must then be verified (Verify Bank Account) before Lob will create a check from it. The returned record omits the full account number.",
  idempotent: false,
  params: [
    {
      key: "routingNumber",
      label: "Routing number",
      type: "string",
      required: true,
      validation: { minLength: 9, maxLength: 9 },
    },
    {
      key: "accountNumber",
      label: "Account number",
      type: "secret",
      required: true,
      validation: { maxLength: 17 },
    },
    {
      key: "accountType",
      label: "Account type",
      type: "select",
      required: true,
      options: [{ value: "company", label: "Company" }, {
        value: "individual",
        label: "Individual",
      }],
    },
    {
      key: "signatory",
      label: "Signatory",
      type: "string",
      required: true,
      validation: { maxLength: 30 },
      hint: "Name printed on checks.",
    },
    { key: "description", label: "Description", type: "string" },
    { key: "metadata", label: "Metadata", type: "json", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Bank account ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "bank_name", type: "string", label: "Bank name" },
    { key: "account_type", type: "string", label: "company | individual" },
    {
      key: "verified",
      type: "boolean",
      label: "Verified (required before a check can be created)",
    },
    {
      key: "microdeposit_type",
      type: "string",
      label: "amounts | descriptor_code — how to verify",
    },
  ],

  async execute(input, ctx) {
    const created = await new LobClient(ctx).json("/bank_accounts", {
      method: "POST",
      body: compact({
        routing_number: input.routingNumber,
        account_number: input.accountNumber,
        account_type: input.accountType,
        signatory: input.signatory,
        description: input.description,
        metadata: asOptionalJson(input.metadata, "Metadata"),
      }),
    });
    return stripBankSecrets(created);
  },
};

export default bankAccountCreate;
