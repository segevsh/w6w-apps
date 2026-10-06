import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/orderstages/{id}` — Update a order or opportunity stage.
 */
interface Input {
  id: number;
  name?: string;
  probability?: number;
  fields?: unknown;
}

const orderStageUpdate: ActionDefinition<Input> = {
  key: "order-stage-update",
  type: "perform",
  resource: "order",
  title: "Update Order Stage",
  description: "Update a order or opportunity stage.",
  idempotent: true,
  params: [
    idParam("id", "Order Stage ID"),
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "probability",
      "label": "Probability %",
      "type": "number",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated order stage" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      probability: input.probability,
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/orderstages/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default orderStageUpdate;
