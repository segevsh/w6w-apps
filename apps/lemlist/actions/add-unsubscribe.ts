import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  value: string;
}

/**
 * `POST /v2/unsubscribes/variables/{value}` — the non-deprecated replacement for
 * `POST /unsubscribes/{email}` (see `list-unsubscribes.ts` for the full
 * deprecation table).
 *
 * `idempotent: true`, and unusually this is the vendor's own guarantee rather
 * than an inference: "This operation is idempotent — if the variable is already
 * unsubscribed, the existing record is returned."
 *
 * The value may be an email, a **domain**, a LinkedIn URL or a phone number. A
 * domain suppresses every address under it, which is a much broader effect than
 * the action's name suggests, so the param hint says so.
 */
const addUnsubscribe: ActionDefinition<Input> = {
  key: "add-unsubscribe",
  type: "perform",
  resource: "unsubscribe",
  title: "Add Unsubscribe",
  description:
    "Add an email, domain, LinkedIn URL or phone number to the team's unsubscribe list. Idempotent per lemlist.",
  idempotent: true,
  params: [
    {
      key: "value",
      label: "Value",
      type: "string",
      required: true,
      placeholder: "john.doe@example.com",
      hint: "An email, a domain, a LinkedIn URL or a phone number. Passing a DOMAIN suppresses " +
        "every address at that domain, not just one person.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Unsubscribe id" },
    { key: "value", type: "string", label: "The unsubscribed value" },
    { key: "source", type: "string", label: "Origin of the unsubscription" },
  ],

  execute(input, ctx) {
    return new LemlistClient(ctx).request(
      `/v2/unsubscribes/variables/${encodeURIComponent(input.value)}`,
      { method: "POST" },
    );
  },
};

export default addUnsubscribe;
