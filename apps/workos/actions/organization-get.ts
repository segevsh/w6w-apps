import type { ActionDefinition } from "@w6w/types";
import { WorkOSClient } from "../lib/client.ts";

/**
 * `GET /organizations/{id}` — one customer, with its verified domains.
 *
 * The domains are the interesting part. A domain reaches `verified` only after
 * the customer proves ownership by DNS record, and **an unverified domain does
 * not route SSO** — a user signing in with that email address is not sent to
 * the customer's identity provider. Setup that looks finished but has a
 * `pending` domain is the usual cause of "SSO isn't working for us", so the
 * domain states are surfaced separately rather than left in the blob.
 */
const action: ActionDefinition = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get an organization",
  description:
    "One customer and its domains. A domain still `pending` verification does not route SSO, " +
    "which is the usual cause of a setup that looks finished but does not work.",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "org_01EHZNVPK3SFK441A1RGBFSHRT",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domains", type: "array", label: "Domains, with their verification state" },
    { key: "unverifiedDomains", type: "array", label: "Domains that will NOT route SSO" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");

    const org = await new WorkOSClient(ctx).request<
      { domains?: Array<{ domain?: string; state?: string }> }
    >(`/organizations/${encodeURIComponent(id)}`);

    const domains = org?.domains ?? [];
    const unverifiedDomains = domains
      .filter((d) => d.state && d.state !== "verified")
      .map((d) => String(d.domain ?? ""));

    return { ...org, unverifiedDomains };
  },
};

export default action;
