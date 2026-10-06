import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient, stripBankSecrets } from "../lib/client.ts";

interface Input {
  bankAccountId: string;
}

const bankAccountGet: ActionDefinition<Input> = {
  key: "bank-account-get",
  type: "read",
  resource: "bank-account",
  title: "Get Bank Account",
  description:
    "Retrieve a bank account by id, including whether it is verified. The full account number is removed from the result (Lob echoes it back).",
  params: [{
    key: "bankAccountId",
    label: "Bank account ID",
    type: "string",
    required: true,
    placeholder: "bank_…",
    hint: "Lob ids start with `bank_`.",
  }],
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
    return stripBankSecrets(
      await new LobClient(ctx).json(`/bank_accounts/${encodeId(input.bankAccountId)}`),
    );
  },
};

export default bankAccountGet;
