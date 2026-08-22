import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, compact } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /api/v2/jobs/verification-email` — ask Auth0 to re-send the "confirm
 * your address" email.
 *
 * It is a **job**, not a send: the response is a job record whose `status`
 * starts as `pending`, and the email leaves afterwards. A workflow that treats
 * a `201` as "delivered" is claiming more than happened.
 *
 * Auth0 uses the tenant's own email template and provider, so what the user
 * receives is whatever the tenant configured — not something this call decides.
 *
 * Sending it twice sends two emails, which is why this is not idempotent.
 */
const action: ActionDefinition = {
  key: "verification-email-send",
  type: "perform",
  resource: "user",
  title: "Send a verification email",
  description:
    "Queue Auth0's address-verification email. It returns a JOB — pending, not delivered — and " +
    "uses the tenant's own template.",
  idempotent: false,
  params: [
    USER_ID_PARAM,
    {
      key: "clientId",
      label: "Application ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Which application's branding and redirect the email should use. Defaults to the " +
        "tenant's setting.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "For a member of an organization, so the email carries that organization's branding.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status (starts pending)" },
    { key: "type", type: "string", label: "Type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");

    return await new Auth0Client(ctx).request("/jobs/verification-email", {
      method: "POST",
      body: compact({
        user_id: userId,
        client_id: p.clientId,
        organization_id: p.organizationId,
      }),
    });
  },
};

export default action;
