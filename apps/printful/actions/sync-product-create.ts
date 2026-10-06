import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PrintfulClient } from "../lib/client.ts";

interface Input {
  name: string;
  externalId?: string;
  thumbnail?: string;
  syncVariants: unknown;
}

/** `POST /store/products` — Create a sync product together with its sync variants, each linked to a catalog variant and a print file. */
const syncProductCreate: ActionDefinition<Input> = {
  key: "sync-product-create",
  type: "perform",
  resource: "sync-product",
  title: "Create Sync Product",
  description:
    "Create a sync product together with its sync variants, each linked to a catalog variant and a print file.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Sync product name.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your own id for this product.",
    },
    {
      key: "thumbnail",
      label: "Thumbnail URL",
      type: "string",
      hint: "Image URL used as the product thumbnail.",
    },
    {
      key: "syncVariants",
      label: "Sync variants",
      type: "json",
      required: true,
      hint:
        'Array of {"variant_id":4011,"retail_price":"20.00","files":[{"url":"https://…"}]}; `variant_id` and `files` are required on each.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Sync product ID" },
    { key: "external_id", type: "string", label: "External ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "variants", type: "number", label: "Variant count" },
    { key: "synced", type: "number", label: "Synced variant count" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "POST",
      "/store/products",
      {
        body: {
          sync_product: compact({
            name: input.name,
            external_id: input.externalId,
            thumbnail: input.thumbnail,
          }),
          sync_variants: jsonValue(input.syncVariants),
        },
      },
    );
    return result ?? {};
  },
};

export default syncProductCreate;
