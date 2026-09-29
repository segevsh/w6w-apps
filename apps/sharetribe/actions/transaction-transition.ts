import { asOptionalJson, SharetribeClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { idParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
  transition: string;
  params?: unknown;
}

/**
 * `POST /v1/integration_api/transactions/transition` — transition a transaction to a new state.
 *
 * Only transitions where the actor is `:actor.role/operator` in your transaction process
 * definition can be made through this API — a transition reserved for the customer or provider
 * role is rejected. A transaction can have at most 100 transitions total.
 *
 * Not idempotent: a transition is a real state change (and, per the vendor's own line-item
 * examples, can carry a real payment side effect), and retrying it after a successful call hits
 * the "invalid transition for the current state" conflict rather than repeating harmlessly.
 * Use `transaction-transition-speculative` first to validate params or preview the resulting
 * price breakdown without changing anything.
 */
const transactionTransition: ActionDefinition<Input> = {
  key: "transaction-transition",
  type: "perform",
  resource: "transaction",
  title: "Transition Transaction",
  description: "Move a transaction to its next state via an operator-triggered transition.",
  idempotent: false,
  params: [
    idParam,
    {
      key: "transition",
      label: "Transition",
      type: "string",
      required: true,
      hint: "One of your transaction process's possible next transitions, e.g. " +
        '"transition/accept".',
    },
    {
      key: "params",
      label: "Transition parameters",
      type: "json",
      hint: "Object, per your transaction process definition. Leave empty for a transition " +
        "that needs none.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command("/transactions/transition", {
      id: input.id,
      transition: input.transition,
      params: asOptionalJson(input.params, "params") ?? {},
    });
  },
};

export default transactionTransition;
