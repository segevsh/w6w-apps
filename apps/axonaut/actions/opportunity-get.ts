import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/opportunities/{opportunityId}` — Get one opportunity by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  opportunityId: number;
}

const opportunityGet: ActionDefinition<Input> = {
  key: "opportunity-get",
  type: "read",
  resource: "opportunity",
  title: "Get Opportunity",
  description: "Get one opportunity by id.",
  params: [
    {
      key: "opportunityId",
      label: "Opportunity ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the opportunity.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Opportunity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "probability", type: "number", label: "Probability" },
    { key: "pipe_name", type: "string", label: "Pipe" },
    { key: "pipe_step_name", type: "string", label: "Pipe step" },
    { key: "is_win", type: "boolean", label: "Is won" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/opportunities/${encodeId(input.opportunityId)}`);
  },
};

export default opportunityGet;
