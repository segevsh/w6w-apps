import type { ActionDefinition } from "@w6w/types";
import { AssetDeliveryClient } from "../lib/asset-client.ts";

interface Input {
  clientId: string;
  assetPath: string;
}

/**
 * `GET /v1/assets/pub/{clientId}/a/latest/{assetPath}` — one published marketplace asset (a
 * page/config JSON document, or an image asset's metadata) by its latest version.
 *
 * `requiresAuth: false` — see `lib/asset-client.ts` for why the client ID here is a public path
 * segment, not a credential to route through an Auth connection.
 */
const assetGet: ActionDefinition<Input> = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get Marketplace Asset",
  description: "Read one published marketplace config/content asset by path, via the public " +
    "Asset Delivery API.",
  requiresAuth: false,
  params: [
    {
      key: "clientId",
      label: "Marketplace API Client ID",
      type: "string",
      required: true,
      hint: "A public value from Console > Advanced > Applications — not the Integration API " +
        "Client ID/Secret this app's connections use.",
    },
    {
      key: "assetPath",
      label: "Asset path",
      type: "string",
      required: true,
      placeholder: "content/pages/landing-page.json",
      hint: "The asset's path, without a leading slash.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The asset's own data" },
    { key: "included", type: "array", label: "Referenced image assets, if any" },
    { key: "meta", type: "object", label: "version — the asset tree version" },
  ],

  execute(input, ctx) {
    return new AssetDeliveryClient(ctx).assetByLatest(input.clientId, input.assetPath);
  },
};

export default assetGet;
