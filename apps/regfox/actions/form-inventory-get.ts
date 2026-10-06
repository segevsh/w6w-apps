import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `GET /v2/public/forms/{formID}/inventory` */
const formInventoryGet: ActionDefinition<Record<string, unknown>> = {
  key: "form-inventory-get",
  type: "read",
  resource: "inventory",
  title: "Get Form Inventory",
  description: "Get the live inventory (ticket and item supply) of a registration form.",
  params: [requiredId("formId", "Form ID")],
  output: [{ key: "inventory", type: "array", label: "Inventory items" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call<unknown[]>(
      `/forms/${encodeId(input.formId)}/inventory`,
    );
    return { inventory: body.data ?? [] };
  },
};

export default formInventoryGet;
