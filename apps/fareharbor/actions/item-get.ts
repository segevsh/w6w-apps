import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, detailedParam, itemParam, pk, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  itemPk: number | string;
  detailed?: boolean;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description:
    "Fetch one item (bookable product): pricing prototypes, custom fields, images and FAQs.",
  params: [
    companyParam,
    itemParam,
    detailedParam,
  ],
  output: [
    { key: "item", type: "object", label: "Item" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/items/${pk(input.itemPk, "itemPk")}/`,
      {
        query: { detailed: input.detailed },
      },
    );
  },
};

export default itemGet;
