import type { ActionDefinition } from "@w6w/types";
import { SnowflakeClient } from "../lib/client.ts";

interface Input {
  statementHandle: string;
}

interface Output {
  success: boolean;
  message?: string;
}

const statementCancel: ActionDefinition<Input, Output> = {
  key: "statement-cancel",
  type: "perform",
  resource: "statement",
  title: "Cancel Statement",
  description: "Cancel a running statement by its handle.",
  // Cancelling an already-cancelled/finished statement is a safe no-op on Snowflake's side.
  idempotent: true,
  params: [
    { key: "statementHandle", label: "Statement handle", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SnowflakeClient(ctx).cancelStatement(input.statementHandle);
  },
};

export default statementCancel;
