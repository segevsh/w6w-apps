import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  bankAccountId: string;
}

const bankAccountDelete: ActionDefinition<Input> = {
  key: "bank-account-delete",
  type: "perform",
  resource: "bank-account",
  title: "Delete Bank Account",
  description: "Delete a bank account. Checks already created from it are unaffected.",
  idempotent: true,
  params: [{
    key: "bankAccountId",
    label: "Bank account ID",
    type: "string",
    required: true,
    placeholder: "bank_…",
    hint: "Lob ids start with `bank_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/bank_accounts/${encodeId(input.bankAccountId)}`, {
      method: "DELETE",
    });
  },
};

export default bankAccountDelete;
