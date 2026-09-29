import type { ActionDefinition } from "@w6w/types";
import { AssetDeliveryClient } from "../lib/asset-client.ts";

interface Input {
  clientId: string;
  assetPaths: string[] | string;
  pathPrefix?: string;
}

/**
 * `GET /v1/assets/pub/{clientId}/a/latest/[prefix/]?assets=a,b,c` — several published
 * marketplace assets by their latest version, in one request.
 *
 * The response may include data for none, some, or all of the requested assets — a missing
 * asset is silently absent from `data` rather than a 404, per the vendor's own docs. Assets are
 * returned in lexical order of their path, not the order requested.
 */
const assetList: ActionDefinition<Input> = {
  key: "asset-list",
  type: "search",
  resource: "asset",
  title: "List Marketplace Assets",
  description: "Read several published marketplace config/content assets by path in one call, " +
    "via the public Asset Delivery API.",
  requiresAuth: false,
  params: [
    {
      key: "clientId",
      label: "Marketplace API Client ID",
      type: "string",
      required: true,
      hint: "A public value from Console > Advanced > Applications.",
    },
    {
      key: "assetPaths",
      label: "Asset paths",
      type: "string",
      required: true,
      placeholder: "content/pages/landing-page.json,content/translations/en.json",
      hint: "Comma-separated asset paths, relative to Path prefix if given.",
    },
    {
      key: "pathPrefix",
      label: "Path prefix",
      type: "string",
      hint: 'Optional common prefix for every path above, e.g. "content/pages".',
    },
  ],
  output: [
    { key: "data", type: "array", label: "The requested assets, in lexical path order" },
    { key: "included", type: "array", label: "Referenced image assets, if any" },
    { key: "meta", type: "object", label: "version — the asset tree version" },
  ],

  execute(input, ctx) {
    const paths = typeof input.assetPaths === "string"
      ? input.assetPaths.split(",").map((s) => s.trim()).filter(Boolean)
      : input.assetPaths;
    return new AssetDeliveryClient(ctx).assetsByLatest(input.clientId, paths, input.pathPrefix);
  },
};

export default assetList;
