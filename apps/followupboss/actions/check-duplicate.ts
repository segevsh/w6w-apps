import type { ActionDefinition } from "@w6w/types";
import { FubClient } from "../lib/client.ts";

interface Input {
  email?: string;
  phone?: string;
}

/**
 * `GET /people/checkDuplicate` — does this person already exist?
 *
 * The reason this exists as a separate endpoint, rather than being a search with
 * a `limit=1`, is the sentence in its documentation that no search can match:
 *
 *   > "This call will tell you if a person exists or not, **even if you do not
 *   > have access to that person with the API key you're using**."
 *
 * That is the whole value. An agent's key cannot see contacts assigned to other
 * agents, so `GET /people?email=...` returning nothing means "not visible to
 * you", which is a different fact from "not in the account" — and treating them
 * as the same is exactly how a duplicate gets created. This endpoint answers the
 * account-wide question regardless of the key's scope, and reports which field
 * matched and who currently owns the contact:
 *
 *     {"found": true, "matchedBy": "email", "assignedTo": "Agent Smith"}
 *     {"found": false}
 *
 * Both `email` and `phone` are optional in the schema; sending neither would be
 * a pointless call, so at least one is expected in practice. That is left to the
 * API to enforce rather than guessed at here, since the docs do not mark either
 * as required.
 */
const checkDuplicate: ActionDefinition<Input> = {
  key: "check-duplicate",
  type: "read",
  resource: "person",
  title: "Check Duplicate",
  description:
    "Check whether a contact with this email or phone already exists — account-wide, even for " +
    "records your API key cannot otherwise see. Reports which field matched and who the contact " +
    "is assigned to. Use this before creating, not a search: a search scoped to an agent's key " +
    "returns nothing for a contact owned by someone else.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Email address to look for." },
    { key: "phone", label: "Phone", type: "string", hint: "Phone number to look for." },
  ],
  output: [
    { key: "found", type: "boolean", label: "Whether a match exists" },
    { key: "matchedBy", type: "string", label: "Which field matched (`email` or `phone`)" },
    { key: "assignedTo", type: "string", label: "Agent currently assigned to the match" },
  ],

  execute(input, ctx) {
    return new FubClient(ctx).request("/people/checkDuplicate", {
      query: { email: input.email, phone: input.phone },
    });
  },
};

export default checkDuplicate;
