import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient } from "../lib/client.ts";

/**
 * `GET /v2/order_statuses` — the store's order statuses.
 *
 * Worth calling before hard-coding a `status_id` anywhere. Each entry carries a
 * `system_label` *and* a `custom_label`, because a merchant can rename any status
 * in the control panel: matching on the display name breaks the first time
 * someone renames "Awaiting Fulfillment", while the numeric `id` and the
 * `system_label` do not.
 */
const orderStatusList: ActionDefinition<Record<string, never>, { statuses: unknown[] }> = {
  key: "order-status-list",
  type: "read",
  resource: "order",
  title: "List Order Statuses",
  description: "The store's order statuses, with both their system and merchant-customised labels.",
  params: [],
  output: [{ key: "statuses", type: "array", label: "Order statuses" }],

  async execute(_input, ctx) {
    const statuses = await new BigCommerceClient(ctx).v2List("/order_statuses");
    return { statuses };
  },
};

export default orderStatusList;
