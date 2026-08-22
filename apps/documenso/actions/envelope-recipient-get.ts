import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";

/**
 * `GET /envelope/recipient/{recipientId}` — verified against Documenso's v2
 * OpenAPI document.
 *
 * One recipient's own state, which is the answer to "has Ada signed yet" — the
 * envelope's `status` only turns `COMPLETED` once *everyone* has, so polling it
 * for one person's progress waits for the slowest signer.
 */
const action: ActionDefinition = {
  key: "envelope-recipient-get",
  type: "read",
  resource: "recipient",
  title: "Get a recipient",
  description: "One recipient's signing state — the answer the envelope's status cannot give.",
  params: [
    { key: "recipientId", label: "Recipient ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Recipient id" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "role", type: "string", label: "SIGNER, APPROVER, CC or VIEWER" },
    { key: "signingStatus", type: "string", label: "Whether THIS person has signed" },
    { key: "readStatus", type: "string", label: "Whether they have opened it" },
    { key: "signingOrder", type: "number", label: "Their place in a sequential signing order" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const recipientId = Number(p.recipientId);
    if (!Number.isFinite(recipientId)) throw new Error("`recipientId` is required");

    ctx.log("info", "getting a Documenso recipient", { recipientId });

    return await new DocumensoClient(ctx).request(
      `/envelope/recipient/${encodeURIComponent(String(recipientId))}`,
    );
  },
};

export default action;
