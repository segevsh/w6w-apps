import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, encodeId } from "../lib/client.ts";

/**
 * `PATCH /api/v2/opportunities/{opportunityId}/lost` — Register an opportunity as lost.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  opportunityId: number;
  date?: string;
}

const opportunityLost: ActionDefinition<Input> = {
  key: "opportunity-lost",
  type: "perform",
  resource: "opportunity",
  title: "Mark Opportunity Lost",
  description: "Register an opportunity as lost.",
  idempotent: true,
  params: [
    {
      key: "opportunityId",
      label: "Opportunity ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the opportunity.",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint: "When it was lost. ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
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
    return new AxonautClient(ctx).one(`/opportunities/${encodeId(input.opportunityId)}/lost`, {
      method: "PATCH",
      body: compact({
        "date": input.date,
      }),
    });
  },
};

export default opportunityLost;
