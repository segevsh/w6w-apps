import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  orgId?: string;
}

type Output = Array<{
  id: number;
  name: string;
  access?: string;
  orgDomain?: string;
  /** Every doc in the workspace, inline. This is the docId lookup. */
  docs?: Array<{ id: string; name: string; access?: string; isPinned?: boolean }>;
}>;

/**
 * `GET /orgs/{orgId}/workspaces`.
 *
 * The workhorse discovery call: Grist nests each workspace's **documents inline**
 * in the response, so this single request answers "what docIds can I reach?"
 * There is no `GET /docs` collection to list — a docId comes from here, or from
 * the URL of a doc someone already opened.
 *
 * `orgId` defaults to the literal string `current`, which Grist documents as
 * "the org is implied by the domain in the url" — on `docs.getgrist.com` that is
 * the personal area, on `<team>.getgrist.com` that team. It also accepts a
 * numeric id or a subdomain string from `list-orgs`, so a connection to one site
 * can still enumerate another org the same user belongs to.
 */
const listWorkspaces: ActionDefinition<Input, Output> = {
  key: "list-workspaces",
  type: "read",
  resource: "workspace",
  title: "List Workspaces and Documents",
  description:
    "List an organization's workspaces with every document inside them — the way to discover document IDs.",
  params: [
    {
      key: "orgId",
      label: "Organization",
      type: "string",
      default: "current",
      hint: "`current` (the org implied by this connection's site URL), a numeric org ID, or a " +
        "subdomain such as `gristlabs`. Both id forms come from `list-orgs`.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Workspace name" },
    { key: "access", type: "string", label: "Your access level" },
    { key: "docs", type: "array", label: "Documents in this workspace" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    const orgId = input.orgId?.trim() || "current";
    return client.request<Output>(`/orgs/${encodeURIComponent(orgId)}/workspaces`);
  },
};

export default listWorkspaces;
