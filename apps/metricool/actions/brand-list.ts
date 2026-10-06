import type { ActionDefinition } from "@w6w/types";
import { callList } from "../lib/client.ts";

/** `GET /v2/settings/brands` — the brands of the connected user. */
const brandList: ActionDefinition<Record<string, never>> = {
  key: "brand-list",
  type: "read",
  resource: "brand",
  title: "List Brands",
  description: "List the brands (profiles) of the connected Metricool account. Each brand's `id` " +
    "is the blogId the other actions take.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Brands (id, label, title, timezone, networksData, …)" },
    { key: "count", type: "number", label: "Number of brands" },
  ],

  execute(_input, ctx) {
    return callList(ctx, "/v2/settings/brands");
  },
};

export default brandList;
