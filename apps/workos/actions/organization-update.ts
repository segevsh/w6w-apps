import type { ActionDefinition } from "@w6w/types";
import { compact, csv, WorkOSClient } from "../lib/client.ts";

/**
 * `PUT /organizations/{id}` — rename a customer, or change its domains.
 *
 * ## `domain_data` REPLACES the domain list
 *
 * This is the sharp edge. Sending one domain to add a second one **removes the
 * first**, and removing a verified domain stops routing SSO for everybody with
 * an address at it — a silent lockout for an entire customer's staff, with no
 * error anywhere.
 *
 * So the domain field here is optional and, when used, is documented as the
 * complete list. Leaving it blank changes only the name, which is what most
 * callers want.
 */
const action: ActionDefinition = {
  key: "organization-update",
  type: "perform",
  resource: "organization",
  title: "Update an organization",
  description:
    "Rename a customer or set its domains. Domains REPLACE the existing list — dropping a " +
    "verified one stops SSO for everybody with an address at it, silently.",
  idempotent: true,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
    },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "domains",
      label: "Domains (complete list)",
      type: "string",
      default: "",
      hint: "REPLACES every domain on the organization. Include the ones you are keeping.",
    },
    {
      key: "domainState",
      label: "Domain State",
      type: "select",
      default: "pending",
      options: [
        { value: "pending", label: "Pending — verified by DNS" },
        { value: "verified", label: "Verified — asserted by you" },
      ],
      showIf: { "!=": [{ var: "domains" }, ""] },
    },
    { key: "externalId", label: "External ID", type: "string", default: "", advanced: true },
    { key: "metadata", label: "Metadata", type: "json", default: "", advanced: true },
  ],
  output: [{ key: "id", type: "string", label: "Organization ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");

    const domains = csv(p.domains);
    const state = p.domainState === undefined ? "pending" : String(p.domainState);
    const body = compact({
      name: p.name,
      domain_data: domains?.map((domain) => ({ domain, state })),
      external_id: p.externalId,
      metadata: p.metadata,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — give a name, domains, external id or metadata");
    }
    if (domains) {
      ctx.log("info", "replacing an organization's entire domain list", {
        organizationId: id,
        count: domains.length,
      });
    }

    return await new WorkOSClient(ctx).request(`/organizations/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
