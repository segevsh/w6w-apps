import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/controls/{controlId}` — Read one control.
 */
interface Input {
  workspaceId: number;
  controlId: number;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "control-get",
  type: "read",
  resource: "control",
  title: "Get Control",
  description: "Read one control.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Numeric id from the List Workspaces action.",
    },
    {
      key: "controlId",
      label: "Control ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Controls.",
    },
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
  ],
  output: [
    { key: "id", type: "number", label: "Control ID" },
    { key: "code", type: "string", label: "Control code" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(
      `/workspaces/${seg(input.workspaceId)}/controls/${seg(input.controlId)}`,
      {
        "expand[]": toList(input.expand),
      },
    );
  },
};

export default action;
