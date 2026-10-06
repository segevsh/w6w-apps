import type { ActionDefinition } from "@w6w/types";
import { buildBody, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/priceLists` — Create a price list.
 */
interface Input {
  name: string;
  code?: string;
  active?: boolean;
  isDefault?: boolean;
  fields?: unknown;
}

const priceListCreate: ActionDefinition<Input> = {
  key: "price-list-create",
  type: "perform",
  resource: "product",
  title: "Create Price List",
  description: "Create a price list.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "code",
      "label": "Code",
      "type": "string",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "isDefault",
      "label": "Default",
      "type": "boolean",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created price list" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      code: input.code,
      active: input.active,
      isDefault: input.isDefault,
    });
    const data = await new UpsalesClient(ctx).data("POST", "/priceLists", { body });
    return { data };
  },
};

export default priceListCreate;
