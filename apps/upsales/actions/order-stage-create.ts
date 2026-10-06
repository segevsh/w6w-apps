import type { ActionDefinition } from "@w6w/types";
import { buildBody, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/orderstages` — Create a order or opportunity stage.
 */
interface Input {
  name: string;
  probability?: number;
  fields?: unknown;
}

const orderStageCreate: ActionDefinition<Input> = {
  key: "order-stage-create",
  type: "perform",
  resource: "order",
  title: "Create Order Stage",
  description: "Create a order or opportunity stage.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "probability",
      "label": "Probability %",
      "type": "number",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created order stage" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      probability: input.probability,
    });
    const data = await new UpsalesClient(ctx).data("POST", "/orderstages", { body });
    return { data };
  },
};

export default orderStageCreate;
