import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/monitoring-tests/{testId}` — Read one monitoring test with its latest result.
 */
interface Input {
  workspaceId: number;
  testId: number;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "monitoring-test-get",
  type: "read",
  resource: "monitoring-test",
  title: "Get Monitoring Test",
  description: "Read one monitoring test with its latest result.",
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
    expandParam(["controls", "monitorInstances", "disablingUser"]),
  ],
  output: [
    { key: "id", type: "number", label: "Test ID" },
    { key: "checkResultStatus", type: "string", label: "Latest result" },
    { key: "checkStatus", type: "string", label: "Check status" },
    { key: "failedSince", type: "string", label: "Failing since" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(
      `/workspaces/${seg(input.workspaceId)}/monitoring-tests/${seg(input.testId)}`,
      {
        "expand[]": toList(input.expand),
      },
    );
  },
};

export default action;
