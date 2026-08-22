import type { ActionDefinition } from "@w6w/types";
import { contactIdentity, LoopsClient } from "../lib/client.ts";
import { CONTACT_IDENTITY_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/contacts/find` — verified against Loops' OpenAPI document.
 *
 * Returns an **array**, not a single contact, and an unknown contact is an
 * empty array rather than a `404`. So "did we find them" is a length check, and
 * a workflow that reads `result.email` off the response gets `undefined` rather
 * than an error.
 */
const action: ActionDefinition = {
  key: "contact-find",
  type: "read",
  resource: "contact",
  title: "Find a contact",
  description: "Look up a contact by email or user id.",
  params: [...CONTACT_IDENTITY_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const identity = contactIdentity(p.email, p.userId, "`contact-find`");

    ctx.log("info", "finding a Loops contact", { by: Object.keys(identity)[0] });

    // An unknown contact is `[]`, not a 404 — the caller checks the length.
    return await new LoopsClient(ctx).request("/contacts/find", { query: identity });
  },
};

export default action;
