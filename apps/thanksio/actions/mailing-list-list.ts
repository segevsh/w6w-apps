import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";
import { itemsPerPageParam } from "../lib/params.ts";

/** `GET /api/v2/mailing-lists/` — `data` / `links` / `meta` envelope. */
interface Input {
  itemsPerPage?: number;
}

const mailingListList: ActionDefinition<Input> = {
  key: "mailing-list-list",
  type: "read",
  resource: "mailing-list",
  title: "List Mailing Lists",
  description: "List the mailing lists on the account.",
  params: [itemsPerPageParam],
  output: [
    { key: "mailingLists", type: "array", label: "Mailing lists" },
    { key: "links", type: "object", label: "Pagination links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      { data?: unknown[]; links?: unknown; meta?: unknown }
    >("/mailing-lists/", { query: { items_per_page: input.itemsPerPage } });
    return { mailingLists: body.data ?? [], links: body.links, meta: body.meta };
  },
};

export default mailingListList;
