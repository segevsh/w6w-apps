import { getAction } from "../lib/factory.ts";

/** `GET /v1.0/stores/{store_id}` */
export default getAction({
  key: "store-get",
  title: "Get Store",
  description: "Get one store by id.",
  resource: "store",
  path: "/stores/{id}",
  idKey: "storeId",
  idLabel: "Store id",
});
