import type { ActionDefinition } from "@w6w/types";

import { API_BASE, compact, jsonInit, sendJson } from "../lib/client.ts";

/**
 * `POST /organizations` — create one organization.
 *
 * Body is `{ organization: { name, url, resume, user_id } }` — the four simple
 * fields the reference documents for this endpoint. The two nested fields
 * (`organization_custom_fields`, `organization_segments`) are deliberately left
 * out: they are arrays of structured objects whose own schema is not part of
 * this endpoint's documented shape, and guessing at it would be invention. See
 * `README.md`.
 *
 * `idempotent: false` — no idempotency key exists on this endpoint, so a retry
 * after a timeout creates a second organization.
 */
interface Input {
  name?: string;
  url?: string;
  resume?: string;
  userId?: string;
}

const createOrganization: ActionDefinition<Input> = {
  key: "create-organization",
  type: "perform",
  resource: "organization",
  title: "Create Organization",
  description: "Create an organization in RD Station CRM.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", hint: "The organization's name." },
    { key: "url", label: "Website", type: "string", hint: "The organization's site URL." },
    { key: "resume", label: "Summary", type: "text", hint: "Free-text description." },
    {
      key: "userId",
      label: "Owner user ID",
      type: "string",
      hint: "The `id` of the user who owns it, from List Users. Leave empty for unassigned.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Website" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/organizations`);
    const organization = compact({
      name: input.name,
      url: input.url,
      resume: input.resume,
      user_id: input.userId,
    });
    return sendJson(ctx, url, jsonInit("POST", { organization }));
  },
};

export default createOrganization;
