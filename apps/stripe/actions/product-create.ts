import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  name: string;
  description?: string;
  active?: boolean;
  metadata?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a catalogue product. Attach prices to it with `price-create`.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "active", label: "Active", type: "boolean", default: true },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request("/products", {
      form: {
        name: input.name,
        description: unset(input.description),
        active: input.active,
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default productCreate;
