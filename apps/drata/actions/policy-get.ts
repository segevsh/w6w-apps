import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /policies/{policyId}` — Read one policy.
 */
interface Input {
  policyId: number;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "policy-get",
  type: "read",
  resource: "policy",
  title: "Get Policy",
  description: "Read one policy.",
  params: [
    {
      key: "policyId",
      label: "Policy ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Policies.",
    },
    expandParam([
      "groups",
      "controls",
      "weekTimeFrameSlas",
      "gracePeriodSlas",
      "p3MatrixSlas",
      "owner",
    ]),
  ],
  output: [
    { key: "id", type: "number", label: "Policy ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "version", type: "string", label: "Version" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(`/policies/${seg(input.policyId)}`, {
      "expand[]": toList(input.expand),
    });
  },
};

export default action;
