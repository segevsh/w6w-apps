import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `PUT /v1/{source_id}/plans/{oid}` — Rename a plan. The name is the only field the vendor allows to change. */
interface Input {
  source_id: string;
  oid: string;
  name: string;
}

const planUpdate: ActionDefinition<Input> = {
  key: "plan-update",
  type: "perform",
  resource: "plan",
  title: "Update Plan",
  description: "Rename a plan. The name is the only field the vendor allows to change.",
  idempotent: true,
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
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "plan", type: "object", label: "The updated plan" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "PUT",
      `/${encodeId(input.source_id)}/plans/${encodeId(input.oid)}`,
      {
        body: { name: input.name },
      },
    );
  },
};

export default planUpdate;
