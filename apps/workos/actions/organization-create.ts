import type { ActionDefinition } from "@w6w/types";
import { compact, csv, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /organizations` — register a customer company.
 *
 * ## Domains are a claim, not a fact
 *
 * `domain_data` takes `{domain, state}`, and the state is the decision this
 * action makes you think about:
 *
 *   - **`pending`** — WorkOS asks the customer to prove ownership by DNS
 *     record. Until they do, the domain does not route SSO.
 *   - **`verified`** — you are asserting the customer owns it, on your own
 *     authority, and it routes immediately.
 *
 * Asserting `verified` from a workflow means **anyone who can trigger that
 * workflow can claim a domain**, and claiming a domain decides where the people
 * with those email addresses get sent to log in. That is a real attack if the
 * organization name comes from a signup form. `pending` is the default here for
 * that reason, and the parameter says so.
 *
 * ## Creating twice
 *
 * WorkOS refuses a domain already verified by another organization, so a retry
 * that appears to fail may have succeeded — `organization-list` filtered by the
 * same domain is the check.
 */
const action: ActionDefinition = {
  key: "organization-create",
  type: "perform",
  resource: "organization",
  title: "Create an organization",
  description:
    "Register a customer company. Domains default to `pending` verification deliberately — " +
    "asserting one as verified decides where those email addresses get sent to log in.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "domains",
      label: "Domains",
      type: "string",
      default: "",
      placeholder: "acme.com",
      hint: "Comma-separated.",
    },
    {
      key: "domainState",
      label: "Domain State",
      type: "select",
      default: "pending",
      options: [
        { value: "pending", label: "Pending — the customer proves ownership by DNS" },
        { value: "verified", label: "Verified — you assert they own it, and SSO routes at once" },
      ],
      hint: "Marking a domain verified from a workflow lets whoever triggers it decide where " +
        "those email addresses log in. Prefer pending unless the domain is known good.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "Your own id for this customer, so a later lookup does not need a name match.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Flat string map stored on the organization.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const state = p.domainState === undefined ? "pending" : String(p.domainState);
    const domains = csv(p.domains) ?? [];
    if (state === "verified" && domains.length > 0) {
      ctx.log(
        "warn",
        "creating an organization with domains asserted as verified — those addresses will route " +
          "to this organization's SSO immediately",
        { domains },
      );
    }

    return await new WorkOSClient(ctx).request("/organizations", {
      method: "POST",
      body: compact({
        name,
        domain_data: domains.map((domain) => ({ domain, state })),
        external_id: p.externalId,
        metadata: p.metadata,
      }),
    });
  },
};

export default action;
