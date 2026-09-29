import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { idParam, includeParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
  include?: string;
}

/** `GET /v1/integration_api/transactions/show` — a transaction by ID. */
const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description: "Fetch one transaction by ID.",
  params: [idParam, includeParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).show("/transactions/show", {
      id: input.id,
      include: input.include,
    });
  },
};

export default transactionGet;
