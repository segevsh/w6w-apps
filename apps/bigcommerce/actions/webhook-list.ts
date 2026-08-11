import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, bool } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/hooks` — the webhooks this API account created.
 *
 * **It lists only this API account's webhooks, not the store's.** BigCommerce
 * documents webhooks, metafields and scripts as resources "only accessible to the
 * API account that created them", so an empty list here does not mean the store
 * has no webhooks — it means this connection did not create any. Deleting the API
 * account destroys its webhooks with it.
 *
 * The scopes needed to create and read webhooks are, unusually, none: the
 * security note on this document reads "None required. Create and manage webhooks
 * with the default scope of an API account."
 */
interface Input {
  scope?: string;
  destination?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
}

const webhookList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List webhooks created by THIS API account — webhooks are private to the account that made " +
    "them, so this is not a store-wide list.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "string",
      placeholder: "store/order/*",
      hint: "The event subscription, e.g. `store/order/created`. Filters exactly, not by prefix.",
    },
    { key: "destination", label: "Destination URL", type: "string" },
    { key: "isActive", label: "Active only", type: "boolean" },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/hooks", {
      query: {
        scope: input.scope,
        destination: input.destination,
        is_active: bool(input.isActive),
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default webhookList;
