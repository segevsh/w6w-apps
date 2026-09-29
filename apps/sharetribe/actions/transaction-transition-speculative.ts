import { asOptionalJson, SharetribeClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { idParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
  transition: string;
  params?: unknown;
}

/**
 * `POST /v1/integration_api/transactions/transition_speculative` — simulate a transition
 * without performing it.
 *
 * The transaction's actual state is never changed; this is a preview — validate transition
 * parameters, or read the resulting `lineItems` price breakdown, before committing to
 * `transaction-transition`. Because nothing is persisted, this is `idempotent: true`, unlike
 * its real counterpart.
 */
const transactionTransitionSpeculative: ActionDefinition<Input> = {
  key: "transaction-transition-speculative",
  type: "perform",
  resource: "transaction",
  title: "Preview Transaction Transition",
  description: "Simulate a transition (e.g. to preview its price breakdown) without changing " +
    "the transaction.",
  idempotent: true,
  params: [
    idParam,
    {
      key: "transition",
      label: "Transition",
      type: "string",
      required: true,
      hint: "The transition to simulate.",
    },
    {
      key: "params",
      label: "Transition parameters",
      type: "json",
      hint: "Object, per your transaction process definition.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command("/transactions/transition_speculative", {
      id: input.id,
      transition: input.transition,
      params: asOptionalJson(input.params, "params") ?? {},
    });
  },
};

export default transactionTransitionSpeculative;
