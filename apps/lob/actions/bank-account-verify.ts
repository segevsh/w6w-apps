import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeId, LobClient, stripBankSecrets } from "../lib/client.ts";

interface Input {
  bankAccountId: string;
  amounts?: unknown;
  descriptorCode?: string;
}

const bankAccountVerify: ActionDefinition<Input> = {
  key: "bank-account-verify",
  type: "perform",
  resource: "bank-account",
  title: "Verify Bank Account",
  description:
    "Verify a bank account with the two micro-deposit amounts (in cents) or the 6-character descriptor code from the bank statement. The bank account record says which one it needs (microdeposit_type).",
  idempotent: false,
  params: [
    {
      key: "bankAccountId",
      label: "Bank account ID",
      type: "string",
      required: true,
      placeholder: "bank_…",
    },
    {
      key: "amounts",
      label: "Micro-deposit amounts (cents)",
      type: "json",
      hint: "Two integers, e.g. [11, 35]. Use this OR the descriptor code.",
    },
    {
      key: "descriptorCode",
      label: "Descriptor code",
      type: "string",
      hint: "6-character code from the bank statement. Use this OR the amounts.",
    },
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
    const amounts = asOptionalJson<unknown[]>(input.amounts, "Amounts");
    if (amounts !== undefined && input.descriptorCode) {
      throw new Error("Give the amounts or the descriptor code, not both");
    }
    let body: Record<string, unknown>;
    if (amounts !== undefined) {
      if (!Array.isArray(amounts) || amounts.length !== 2 || !amounts.every(Number.isInteger)) {
        throw new Error("Amounts must be an array of two integers (cents)");
      }
      body = { amounts };
    } else if (input.descriptorCode) {
      body = { descriptor_code: input.descriptorCode };
    } else {
      throw new Error("Give the two micro-deposit amounts or the descriptor code");
    }
    const verified = await new LobClient(ctx).json(
      `/bank_accounts/${encodeId(input.bankAccountId)}/verify`,
      { method: "POST", body },
    );
    return stripBankSecrets(verified);
  },
};

export default bankAccountVerify;
