import { getAction } from "../lib/factory.ts";

/** `GET /v1.0/items/{item_id}` */
export default getAction({
  key: "item-get",
  title: "Get Item",
  description: "Get one item, with its variants, by id.",
  resource: "item",
  path: "/items/{id}",
  idKey: "itemId",
  idLabel: "Item id",
});
