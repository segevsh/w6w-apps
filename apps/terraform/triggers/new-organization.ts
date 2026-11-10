import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { listAll, newRows } from "../lib/polls.ts";
import organizationList from "../actions/organization-list.ts";

/**
 * `GET /api/v2/organizations` lists the organizations the token can see: a short list with no
 * order or timestamps worth sorting by, paged with `page[size]` up to 100
 * (https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organizations, read 2026-11-10).
 * Every check reads all pages and diffs the ids against the previous one (`pollSnapshot`, added only).
 */
const newOrganization: TriggerDefinition = {
  key: "new-organization",
  title: "New Organization",
  description:
    "The run gets each HCP Terraform or Terraform Enterprise organization newly visible to the connected token.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Organization name (its id)" },
    { key: "email", type: "string", label: "Admin email" },
    { key: "created-at", type: "string", label: "Created at" },
    { key: "plan", type: "string", label: "Plan" },
  ],
  sample: {
    id: "acme-org",
    type: "organizations",
    email: "admin@example.com",
    "created-at": "2026-11-10T09:00:00.000Z",
    plan: "standard",
  },
  async poll({ state }, ctx) {
    const rows = await listAll(
      organizationList as unknown as ActionDefinition,
      {},
      "organizations",
      ctx,
    );
    return await newRows(state, rows);
  },
};

export default newOrganization;
