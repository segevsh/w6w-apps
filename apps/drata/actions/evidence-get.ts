import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/evidence/{evidenceId}` — Read one evidence item with its artifacts.
 */
interface Input {
  workspaceId: number;
  evidenceId: number;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "evidence-get",
  type: "read",
  resource: "evidence",
  title: "Get Evidence",
  description: "Read one evidence item with its artifacts.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Numeric id from the List Workspaces action.",
    },
    {
      key: "evidenceId",
      label: "Evidence ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Evidence.",
    },
    expandParam(["owners", "artifacts", "controls"]),
  ],
  output: [
    { key: "id", type: "number", label: "Evidence ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "artifacts", type: "array", label: "Artifacts" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(
      `/workspaces/${seg(input.workspaceId)}/evidence/${seg(input.evidenceId)}`,
      {
        "expand[]": toList(input.expand),
      },
    );
  },
};

export default action;
