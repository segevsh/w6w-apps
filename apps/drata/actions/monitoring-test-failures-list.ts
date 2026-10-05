import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam, opts, pageParams } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/monitoring-tests/{testId}/failures` — List the resources currently failing one monitoring test (the "why is this red" answer).
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  workspaceId: number;
  testId: number;
  includeExclusions?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "monitoring-test-failures-list",
  type: "search",
  resource: "monitoring-test",
  title: "List Monitoring Test Failures",
  description:
    'List the resources currently failing one monitoring test (the "why is this red" answer).',
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Numeric id from the List Workspaces action.",
    },
    {
      key: "testId",
      label: "Test ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Monitoring Tests.",
    },
    {
      key: "includeExclusions",
      label: "Include exclusions",
      type: "select",
      options: opts(["true", "false"]),
    },
    expandParam(["tags"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Failing resources" },
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
    { key: "lastCheck", type: "string", label: "When the test last ran" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(
      `/workspaces/${seg(input.workspaceId)}/monitoring-tests/${seg(input.testId)}/failures`,
      {
        "includeExclusions": input.includeExclusions,
        "expand[]": toList(input.expand),
        cursor: input.cursor,
        size: input.size,
        includeTotalCount: input.includeTotalCount || undefined,
      },
    );
  },
};

export default action;
