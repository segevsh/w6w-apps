import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `DELETE /v1/contacts/suppression` — verified against Loops' OpenAPI document.
 *
 * **Lifting a suppression re-enables sending to an address that previously
 * bounced or complained**, and doing that carelessly is how a sender's
 * reputation degrades: mailbox providers treat repeated sends to a hard bounce
 * as a signal. It is the right call for a corrected typo or a mailbox that has
 * been fixed, and the wrong one for "the email did not arrive, try again".
 */
const action: ActionDefinition = {
  key: "contact-suppression-remove",
  type: "perform",
  resource: "contact",
  title: "Lift a suppression",
  description: "Allow sending to an address Loops suppressed after a bounce or complaint.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirm",
      label: "I have confirmed this address is deliverable",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Sending again to a hard bounce damages your sending reputation.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Suppression lifted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");
    if (p.confirm !== true) {
      throw new Error(
        "`confirm` must be true — re-sending to a suppressed address damages sending reputation",
      );
    }

    ctx.log("warn", "lifting a Loops suppression", {});

    return await new LoopsClient(ctx).request("/contacts/suppression", {
      method: "DELETE",
      query: { email },
    });
  },
};

export default action;
