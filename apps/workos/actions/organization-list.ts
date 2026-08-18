import type { ActionDefinition } from "@w6w/types";
import { csv, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /organizations` — the customer companies in this environment.
 *
 * An Organization is WorkOS's unit for one customer. SSO connections,
 * directories, memberships, audit logs and Admin Portal links all hang off one,
 * so this is where most workflows start: turn a company name into an
 * `org_…` id.
 *
 * `domains` filters by verified domain, which is how a self-serve signup gets
 * matched to an enterprise account — somebody signs up as `ada@acme.com` and
 * this answers whether Acme already has an organization with SSO configured.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description:
    "The customer companies in this environment. Filter by verified domain to match a new " +
    "signup's email against an enterprise account that already exists.",
  params: [
    {
      key: "domains",
      label: "Domains",
      type: "string",
      default: "",
      placeholder: "acme.com,acme.co.uk",
      hint: "Comma-separated. Matches organizations that have verified these domains.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "desc",
      options: [
        { value: "desc", label: "Newest first" },
        { value: "asc", label: "Oldest first" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "count", type: "number", label: "Organizations returned" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 50));

    const { items, after } = await new WorkOSClient(ctx).requestAll("/organizations", {
      query: { domains: csv(p.domains), order: String(p.order ?? "desc") },
    }, want);

    return { organizations: items, count: items.length, after };
  },
};

export default action;
