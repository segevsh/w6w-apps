import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { artifactTypes, evidenceStatuses, expandParam, opts, pageParams } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/evidence` — List evidence items in a workspace with their artifacts, owners and status.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  workspaceId: number;
  name?: string;
  evidenceStatuses?: string[] | string;
  artifactTypes?: string[] | string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "evidence-list",
  type: "search",
  resource: "evidence",
  title: "List Evidence",
  description: "List evidence items in a workspace with their artifacts, owners and status.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Numeric id from the List Workspaces action.",
    },
    { key: "name", label: "Name", type: "string", hint: "Substring match, up to 191 characters." },
    {
      key: "evidenceStatuses",
      label: "Status",
      type: "multiselect",
      options: opts(evidenceStatuses),
    },
    {
      key: "artifactTypes",
      label: "Artifact type",
      type: "multiselect",
      options: opts(artifactTypes),
    },
    expandParam(["owners", "artifacts", "controls"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Evidence items" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching records (only with Include total count, first page)",
    },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(`/workspaces/${seg(input.workspaceId)}/evidence`, {
      "name": input.name,
      "evidenceStatuses[]": toList(input.evidenceStatuses),
      "artifactTypes[]": toList(input.artifactTypes),
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
