import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import {
  checkResultStatuses,
  checkStatuses,
  expandParam,
  monitorTypes,
  opts,
  pageParams,
  testSources,
} from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/monitoring-tests` — List a workspace's monitoring tests — the automated checks — with their latest result.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  workspaceId: number;
  checkResultStatus?: string;
  checkStatus?: string;
  type?: string;
  testSource?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "monitoring-test-list",
  type: "search",
  resource: "monitoring-test",
  title: "List Monitoring Tests",
  description:
    "List a workspace's monitoring tests — the automated checks — with their latest result.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Numeric id from the List Workspaces action.",
    },
    {
      key: "checkResultStatus",
      label: "Result",
      type: "select",
      options: opts(checkResultStatuses),
    },
    { key: "checkStatus", label: "Check status", type: "select", options: opts(checkStatuses) },
    { key: "type", label: "Test type", type: "select", options: opts(monitorTypes) },
    { key: "testSource", label: "Test source", type: "select", options: opts(testSources) },
    expandParam(["controls", "monitorInstances", "disablingUser"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Monitoring tests" },
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
    return new DrataClient(ctx).list(`/workspaces/${seg(input.workspaceId)}/monitoring-tests`, {
      "checkResultStatus": input.checkResultStatus,
      "checkStatus": input.checkStatus,
      "type": input.type,
      "testSource": input.testSource,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
