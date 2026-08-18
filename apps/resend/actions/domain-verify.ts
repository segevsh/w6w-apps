import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `POST /domains/{domain_id}/verify` — verified against Resend's OpenAPI
 * document.
 *
 * This asks Resend to re-check DNS; it does not return the verdict. The
 * response is `{ object, id }`, so a workflow that needs to know whether
 * verification succeeded reads `domain-get` afterwards and checks `status`.
 * Saying so here is better than implying the call answers the question.
 */
const action: ActionDefinition = {
  key: "domain-verify",
  type: "perform",
  resource: "domain",
  title: "Verify a domain",
  description: "Ask Resend to re-check a domain's DNS records. Read the result with Get a domain.",
  idempotent: true,
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "object", type: "string", label: "Object type" },
    { key: "id", type: "string", label: "Domain ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domainId = String(p.domainId ?? "").trim();
    if (!domainId) throw new Error("`domainId` is required");

    ctx.log("info", "verifying Resend domain", { domainId });

    return await new ResendClient(ctx).request(
      `/domains/${encodeURIComponent(domainId)}/verify`,
      { method: "POST" },
    );
  },
};

export default action;
