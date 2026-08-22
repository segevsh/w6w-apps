import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";

/**
 * `GET /v1/controls/{controlId}` — one requirement, with its evidence.
 *
 * The reason to fetch a control individually is the mapping: which tests and
 * which documents Vanta considers evidence for it. That is what turns "this
 * control is failing" into "it is failing because these two tests are red and
 * the policy has not been reviewed since March".
 *
 * It is also how a workflow answers the auditor's actual question, which is
 * never "is the test passing" — it is "show me that this requirement is met".
 */
const action: ActionDefinition = {
  key: "control-get",
  type: "read",
  resource: "control",
  title: "Get a control",
  description:
    "One requirement with the tests and documents Vanta treats as its evidence — which is the " +
    "question an auditor actually asks.",
  params: [
    { key: "controlId", label: "Control ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Control ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "owner", type: "object", label: "Who is accountable" },
    { key: "frameworks", type: "array", label: "Frameworks this control belongs to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const controlId = String(p.controlId ?? "").trim();
    if (!controlId) throw new Error("`controlId` is required");
    return await new VantaClient(ctx).request(`/controls/${encodeURIComponent(controlId)}`);
  },
};

export default action;
