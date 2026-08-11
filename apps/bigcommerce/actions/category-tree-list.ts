import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, toList } from "../lib/client.ts";

/**
 * `GET /v3/catalog/trees` — the store's category trees.
 *
 * A multi-storefront store has one tree per storefront, and a category lives in
 * exactly one of them. This is where the `tree_id` that `category-list` filters
 * on comes from, and the reason "the category is missing" is so often "you were
 * reading another channel's tree".
 */
interface Input {
  ids?: string;
  channelIds?: string;
}

const categoryTreeList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "category-tree-list",
  type: "read",
  resource: "category",
  title: "List Category Trees",
  description: "List category trees and the channels each one serves.",
  params: [
    { key: "ids", label: "Tree IDs", type: "string", hint: "Comma-separated. Sent as `id:in`." },
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      hint: "Comma-separated. Sent as `channel_id:in`.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Category trees" }],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/catalog/trees", {
      query: { "id:in": toList(input.ids), "channel_id:in": toList(input.channelIds) },
    });
  },
};

export default categoryTreeList;
