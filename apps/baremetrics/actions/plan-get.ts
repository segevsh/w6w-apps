import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/plans/{oid}` — Fetch one plan by oid. */
interface Input {
  source_id: string;
  oid: string;
}

const planGet: ActionDefinition<Input> = {
  key: "plan-get",
  type: "read",
  resource: "plan",
  title: "Get Plan",
  description: "Fetch one plan by oid.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Plan OID", type: "string", required: true },
  ],
  output: [
    { key: "plan", type: "object", label: "The plan" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "GET",
      `/${encodeId(input.source_id)}/plans/${encodeId(input.oid)}`,
    );
  },
};

export default planGet;
