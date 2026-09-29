import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * `GET /v1/integration_api/marketplace/show` — the marketplace's own public name/description.
 *
 * `attributes.description` is documented as deprecated ("New marketplaces will always have
 * null value") — kept in the output because the vendor still returns the key, not because it
 * is still meaningful.
 */
const marketplaceGet: ActionDefinition<Record<string, never>> = {
  key: "marketplace-get",
  type: "read",
  resource: "marketplace",
  title: "Get Marketplace",
  description: "Read the connected marketplace's own name and (deprecated) description.",
  params: [],
  output: resourceOutput,

  execute(_input, ctx) {
    return new SharetribeClient(ctx).show("/marketplace/show");
  },
};

export default marketplaceGet;
