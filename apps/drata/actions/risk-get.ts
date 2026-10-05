import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /risk-registers/{riskRegisterId}/risks/{riskId}` — Read one risk.
 */
interface Input {
  riskRegisterId: number;
  riskId: string;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "risk-get",
  type: "read",
  resource: "risk",
  title: "Get Risk",
  description: "Read one risk.",
  params: [
    {
      key: "riskRegisterId",
      label: "Risk register ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Risk Registers.",
    },
    {
      key: "riskId",
      label: "Risk ID",
      type: "string",
      required: true,
      hint: "Numeric id, or the risk identifier such as `RISK-001`.",
    },
    expandParam([
      "owners",
      "reviewers",
      "controls",
      "categories",
      "documents",
      "notes",
      "tickets",
      "tasks",
      "customFields",
    ]),
  ],
  output: [
    { key: "id", type: "number", label: "Risk ID" },
    { key: "riskId", type: "string", label: "Risk identifier" },
    { key: "title", type: "string", label: "Title" },
    { key: "score", type: "number", label: "Inherent score" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(
      `/risk-registers/${seg(input.riskRegisterId)}/risks/${seg(input.riskId)}`,
      {
        "expand[]": toList(input.expand),
      },
    );
  },
};

export default action;
