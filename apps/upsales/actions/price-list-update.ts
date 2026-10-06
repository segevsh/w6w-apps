import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/priceLists/{id}` — Update a price list.
 */
interface Input {
  id: number;
  name?: string;
  code?: string;
  active?: boolean;
  isDefault?: boolean;
  fields?: unknown;
}

const priceListUpdate: ActionDefinition<Input> = {
  key: "price-list-update",
  type: "perform",
  resource: "product",
  title: "Update Price List",
  description: "Update a price list.",
  idempotent: true,
  params: [
    idParam("id", "Price List ID"),
    {
      "key": "name",
      "label": "Name",
      "type": "string",
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
  output: [{ key: "data", type: "object", label: "The updated price list" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      code: input.code,
      active: input.active,
      isDefault: input.isDefault,
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/priceLists/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default priceListUpdate;
