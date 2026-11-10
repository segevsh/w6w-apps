import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import type { Param } from "@w6w/types";
import { listAll, newRows } from "../lib/polls.ts";
import workspaceList from "../actions/workspace-list.ts";

/**
 * `GET /api/v2/organizations/{org}/workspaces`: "If omitted, the default sort order is arbitrary but
 * stable", and `sort` offers only name, current-run.created-at and latest-change-at, none of them
 * creation time (https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces, read
 * 2026-11-10). So every check reads all pages (100 per page) and diffs the ids against the previous
 * one (`pollSnapshot`, added only); more than 5000 workspaces in one organization makes the check
 * fail naming the cap.
 */
const params: Param[] = [
  { key: "organization", label: "Organization", type: "string", required: true },
];

const newWorkspace: TriggerDefinition<{ organization?: string }> = {
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each workspace newly created in an HCP Terraform organization.",
  minIntervalMs: 300_000,
  params,
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "auto-apply", type: "boolean", label: "Auto-apply" },
    { key: "locked", type: "boolean", label: "Locked" },
    { key: "created-at", type: "string", label: "Created at" },
    { key: "terraform-version", type: "string", label: "Terraform version" },
  ],
  sample: {
    id: "ws-XdeUVMWShTesDMME",
    type: "workspaces",
    name: "my-workspace",
    "auto-apply": false,
    locked: false,
    "created-at": "2026-11-10T09:00:00.000Z",
    "terraform-version": "1.9.8",
  },
  async poll({ state, params: p }, ctx) {
    const organization = String(p?.organization ?? "").trim();
    if (!organization) throw new Error("Set the Organization to watch.");
    const rows = await listAll(
      workspaceList as unknown as ActionDefinition,
      { organization },
      "workspaces",
      ctx,
    );
    return await newRows(state, rows);
  },
};

export default newWorkspace;
