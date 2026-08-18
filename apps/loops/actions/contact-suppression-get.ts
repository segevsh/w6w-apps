import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts/suppression` — verified against Loops' OpenAPI document.
 *
 * Suppression is not the same as unsubscribed. A contact is suppressed when
 * their address **bounced or complained**, and Loops will refuse to send to
 * them regardless of their subscription state — so "why did this email not
 * arrive" is often answered here rather than by the contact record.
 */
const action: ActionDefinition = {
  key: "contact-suppression-get",
  type: "read",
  resource: "contact",
  title: "Check a suppression",
  description: "Find out whether an address is suppressed after a bounce or complaint.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
      placeholder: "ada@example.com",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    ctx.log("info", "checking a Loops suppression", {});

    return await new LoopsClient(ctx).request("/contacts/suppression", { query: { email } });
  },
};

export default action;
