import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCardlessClient } from "../lib/client.ts";

/**
 * `POST /mandates/{id}/actions/cancel` — cancel a mandate.
 *
 * Cancelling a mandate stops every future payment against it: GoCardless
 * cancels the mandate with the bank, and any subscription pointing at it becomes
 * unusable. Payments already collected are untouched (refund those with
 * `create-refund`).
 *
 * **This is not a no-op when repeated.** GoCardless answers a second cancel with
 * `invalid_state`, so the action is declared `idempotent: false` and the runtime
 * must not replay it — a retried cancel would surface a confusing vendor error
 * rather than the "already cancelled" state the caller wanted.
 *
 * The request carries GoCardless's empty action envelope (`{"mandates": {}}`)
 * and no body fields: the mandate is named in the path and the action in the
 * URL.
 */
interface Input {
  mandateId: string;
}

const cancelMandate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "cancel-mandate",
  type: "perform",
  resource: "mandate",
  title: "Cancel Mandate",
  description:
    "Cancel a mandate at the bank. Every future payment and subscription against it stops; " +
    "already-collected payments are unaffected.",
  idempotent: false,
  params: [
    {
      key: "mandateId",
      label: "Mandate ID",
      type: "string",
      required: true,
      placeholder: "MD0000…",
      hint: "The mandate to cancel. Cancelling an already-cancelled mandate is refused by " +
        "GoCardless with `invalid_state`, not ignored.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Mandate ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).action(
      "mandates",
      `/mandates/${encodeId(input.mandateId)}/actions/cancel`,
    );
  },
};

export default cancelMandate;
