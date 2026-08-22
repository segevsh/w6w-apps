import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";

/**
 * `POST /envelope/recipient/delete` — verified against Documenso's v2 OpenAPI
 * document (required `recipientId`).
 *
 * Note what it takes: **the recipient's id, not the envelope's**. A recipient
 * belongs to exactly one envelope, so the id is enough — which also means a
 * stale id from a duplicated envelope removes somebody from the wrong one.
 *
 * **Removing a recipient orphans the fields assigned to them.** Documenso
 * removes those fields with them, so a signature block placed for that person
 * disappears from the document too.
 */
const action: ActionDefinition = {
  key: "envelope-recipient-remove",
  type: "perform",
  resource: "recipient",
  title: "Remove a recipient",
  description: "Remove a recipient from a draft envelope, along with their fields.",
  idempotent: true,
  params: [
    {
      key: "recipientId",
      label: "Recipient ID",
      type: "number",
      required: true,
      hint: "The RECIPIENT's numeric id — not the envelope's. Their fields go with them.",
    },
  ],
  output: [
    { key: "recipientId", type: "number", label: "Recipient id" },
    { key: "removed", type: "boolean", label: "Removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const recipientId = Number(p.recipientId);
    if (!Number.isFinite(recipientId)) throw new Error("`recipientId` is required");

    ctx.log("warn", "removing a Documenso recipient", { recipientId });

    await new DocumensoClient(ctx).request("/envelope/recipient/delete", {
      method: "POST",
      body: { recipientId },
    });
    return { recipientId, removed: true };
  },
};

export default action;
