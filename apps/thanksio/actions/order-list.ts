import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";
import { itemsPerPageParam, MAILER_TYPES, subAccountIdFilterParam } from "../lib/params.ts";

/** `GET /api/v2/orders/list` — recent orders; `data` / `links` / `meta` envelope. */
interface Input {
  itemsPerPage?: number;
  subAccountId?: number;
  type?: string;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List recent orders, optionally filtered by sub-account or mailer type.",
  params: [
    itemsPerPageParam,
    subAccountIdFilterParam,
    {
      key: "type",
      label: "Mailer type",
      type: "select",
      options: [...MAILER_TYPES, "magnacard", "4x6-postcard", "6x9-postcard"]
        .filter((v, i, a) => a.indexOf(v) === i).map((t) => ({ value: t, label: t })),
      hint: "`postcard` is 4x6 only; `postcard6x9` includes older 6x9 orders.",
    },
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "links", type: "object", label: "Pagination links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      { data?: unknown[]; links?: unknown; meta?: unknown }
    >("/orders/list", {
      query: {
        items_per_page: input.itemsPerPage,
        sub_account_id: input.subAccountId,
        type: input.type,
      },
    });
    return { orders: body.data ?? [], links: body.links, meta: body.meta };
  },
};

export default orderList;
