import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam, opts, pageParams } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/controls` — List the controls in a workspace, filtered by readiness, monitoring, evidence or policy coverage.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  workspaceId: number;
  isMonitored?: string;
  isReady?: string;
  hasEvidence?: string;
  hasPolicy?: string;
  hasPassingTest?: string;
  isEnabled?: string;
  isArchived?: string;
  policyId?: number;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "control-list",
  type: "search",
  resource: "control",
  title: "List Controls",
  description:
    "List the controls in a workspace, filtered by readiness, monitoring, evidence or policy coverage.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Numeric id from the List Workspaces action.",
    },
    { key: "isMonitored", label: "Is monitored", type: "select", options: opts(["true", "false"]) },
    { key: "isReady", label: "Is ready", type: "select", options: opts(["true", "false"]) },
    { key: "hasEvidence", label: "Has evidence", type: "select", options: opts(["true", "false"]) },
    { key: "hasPolicy", label: "Has policy", type: "select", options: opts(["true", "false"]) },
    {
      key: "hasPassingTest",
      label: "Has passing test",
      type: "select",
      options: opts(["true", "false"]),
    },
    { key: "isEnabled", label: "Is enabled", type: "select", options: opts(["true", "false"]) },
    { key: "isArchived", label: "Is archived", type: "select", options: opts(["true", "false"]) },
    { key: "policyId", label: "Policy ID", type: "number" },
    expandParam([
      "customFields",
      "evidenceIds",
      "flags",
      "frameworkTags",
      "owners",
      "requirements",
      "testIds",
      "topics",
    ]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Controls" },
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
    return new DrataClient(ctx).list(`/workspaces/${seg(input.workspaceId)}/controls`, {
      "isMonitored": input.isMonitored,
      "isReady": input.isReady,
      "hasEvidence": input.hasEvidence,
      "hasPolicy": input.hasPolicy,
      "hasPassingTest": input.hasPassingTest,
      "isEnabled": input.isEnabled,
      "isArchived": input.isArchived,
      "policyId": input.policyId,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
