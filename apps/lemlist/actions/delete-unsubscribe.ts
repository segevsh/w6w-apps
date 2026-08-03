import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  value: string;
}

/**
 * `DELETE /v2/unsubscribes/variables/{value}` — lemlist's "Re-subscribe
 * Variable", and the non-deprecated replacement for `DELETE
 * /unsubscribes/{email}` (see `list-unsubscribes.ts` for the deprecation table).
 *
 * ## Some opt-outs cannot be undone, by design
 *
 * lemlist protects two sources: "Variables with a protected source (LEAD or
 * ABUSE) cannot be re-subscribed", and answers **409** for those. That is a
 * compliance guard, not a bug — a person who opted out themselves (`lead`) or
 * filed a spam complaint (`abuse`) stays out. The client surfaces the 409 as a
 * thrown error carrying lemlist's own sentence, and the description says so up
 * front so nobody wires a retry loop around it.
 *
 * A value that was never unsubscribed answers **400** ("Variable not found in
 * unsubscribe list"), so this is not silently idempotent on a repeat — but a
 * retry cannot cause a second effect, so `idempotent: true` still holds.
 *
 * The success body is the bare string `"Variable subscribed"`, not JSON — which
 * is why `LemlistClient.request` falls back to returning raw text rather than
 * throwing on an unparseable body.
 */
const deleteUnsubscribe: ActionDefinition<Input> = {
  key: "delete-unsubscribe",
  type: "perform",
  resource: "unsubscribe",
  title: "Delete Unsubscribe",
  description:
    "Re-subscribe a value by removing it from the unsubscribe list. lemlist refuses (409) for values whose source is `lead` or `abuse`.",
  idempotent: true,
  params: [
    {
      key: "value",
      label: "Value",
      type: "string",
      required: true,
      placeholder: "john.doe@example.com",
      hint:
        "The email, domain, LinkedIn URL or phone number to re-subscribe. lemlist answers 409 " +
        "if it was unsubscribed by the person themselves (`lead`) or via a spam complaint " +
        "(`abuse`), and 400 if it was never on the list.",
    },
  ],
  output: [{ key: "result", type: "string", label: "lemlist's confirmation message" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request(
      `/v2/unsubscribes/variables/${encodeURIComponent(input.value)}`,
      { method: "DELETE" },
    );
  },
};

export default deleteUnsubscribe;
